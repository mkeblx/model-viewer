const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const {PNG} = require('pngjs');
const {colorDelta, drawPixel} =
    require('./third_party/pixelmatch/color-delta.js');

// 35215 is the maximum possible value for the YIQ difference metric
// @see https://github.com/mapbox/pixelmatch/blob/master/index.js#L14
// @see http://www.progmat.uaem.mx:8080/artVol2Num2/Articulo3Vol2Num2.pdf
const MAX_DISTANCE = 35215;

const GOLDEN_IMAGE_RE = /golden\.png$/;

const timePasses = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const compareImages = async (left, right, width, height) => {
  const deltaBuffer = Buffer.alloc(width * height * 4, 0);
  const booleanBuffer = Buffer.alloc(width * height * 4, 0);

  let matched = 0;
  let sum = 0;
  let notMatchingSum = 0;

  if (left.length != right.length) {
    console.warn(`Image buffer lengths are ${left.length} (left) and ${
        right.length} (right)`);
    throw new Error('Image sizes do not match');
  }

  for (let y = 0; y < height; ++y) {
    for (let x = 0; x < width; ++x) {
      const pos = (y * width + x) * 4;
      const delta = colorDelta(left, right, pos, pos);
      const intensity = 255 - Math.round(255 * delta / MAX_DISTANCE);
      const boolean = (intensity === 255 ? 1 : 0) * 255;

      if (boolean) {
        matched++;
      } else {
        notMatchingSum += delta;
      }

      drawPixel(deltaBuffer, pos, 255, intensity, intensity);
      drawPixel(booleanBuffer, pos, boolean, boolean, boolean);

      sum += delta;
    }
  }

  const totalPixels = width * height;
  const notMatchingAverageDistance = notMatchingSum / (totalPixels - matched);
  const averageDistance = sum / totalPixels;
  const deltaPng = PNG.sync.write({width, height, data: deltaBuffer});
  const booleanPng = PNG.sync.write({width, height, data: booleanBuffer});
  const candidatePng = PNG.sync.write({width, height, data: left});
  const goldenPng = PNG.sync.write({width, height, data: right});

  return {
    analysis: {
      averageDistance: averageDistance / MAX_DISTANCE,
      matching: matched / totalPixels,
      notMatchingAverageDistance: notMatchingAverageDistance / MAX_DISTANCE,
    },
    images: {deltaPng, booleanPng, candidatePng, goldenPng}
  };
};

const runTest = async (baseUrl, testSlug, goldens, dimensions) => {
  const scaleFactor = 2;
  const scaledWidth = dimensions.width / scaleFactor;
  const scaledHeight = dimensions.height / scaleFactor;
  const results = [];

  const browser = await puppeteer.launch({
    defaultViewport: {
      width: scaledWidth,
      height: scaledHeight,
      deviceScaleFactor: scaleFactor
    }
  });

  const page = await browser.newPage();

  await page.goto(`${baseUrl}${testSlug}/`);

  await page.evaluate(async () => {
    const modelViewer = document.querySelector('model-viewer');

    if (!modelViewer.loaded) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(reject, 10000);
        modelViewer.addEventListener('load', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });

  const modelViewerImage =
      PNG.sync
          .read(await page.screenshot(
              {clip: {x: 0, y: 0, width: scaledWidth, height: scaledHeight}}))
          .data;

  await browser.close();

  for (const golden of goldens) {
    const goldenImage = PNG.sync
                            .read(await fs.readFile(
                                `./test/fidelity/${testSlug}/${golden.file}`))
                            .data;

    const result = await compareImages(
        modelViewerImage, goldenImage, dimensions.width, dimensions.height);

    results.push(result);
  }

  return results;
};


module.exports.TestRunner = class TestRunner {
  constructor(config) {
    this.config = config;
  }

  async run(baseUrl) {
    const scenarios = [];

    for (const test of this.config) {
      scenarios.push({
        test,
        results:
            await runTest(baseUrl, test.slug, test.goldens, test.dimensions)
      });
    }

    return scenarios;
  }
}

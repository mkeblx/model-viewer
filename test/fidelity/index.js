const {TestRunner} = require('./api.js');
const config = require('./config.json');
const testRunner = new TestRunner(config);
const rimraf = require('rimraf');
const fs = require('fs').promises;
const path = require('path');
const LocalWebServer = require('local-web-server')
const localWebServer = new LocalWebServer()
const server = localWebServer.listen({port: 9030, directory: './'});

testRunner.run('http://localhost:9030/test/fidelity/')
    .then(async (scenarios) => {
      const outputDirectory = path.resolve('./test/fidelity/results');

      console.log('🌈 Rendering Fidelity Analysis');

      try {
        rimraf.sync(outputDirectory);
      } catch (e) {
        console.error(e);
      }

      await fs.mkdir(outputDirectory);

      for (const scenario of scenarios) {
        const {test, results} = scenario;
        const {goldens} = test;
        const scenarioDirectory = path.join(outputDirectory, test.slug);

        console.log(`🎨 Scenario: ${test.slug}`);

        await fs.mkdir(scenarioDirectory);

        for (let i = 0; i < results.length; ++i) {
          const golden = goldens[i];
          const result = results[i];
          const {images, analysis} = result;
          const {deltaPng, booleanPng, candidatePng, goldenPng} = images;
          const goldenDirectory = path.join(scenarioDirectory, golden.name);

          await fs.mkdir(goldenDirectory);
          await Promise.all([
            fs.writeFile(path.join(goldenDirectory, 'delta.png'), deltaPng),
            fs.writeFile(path.join(goldenDirectory, 'boolean.png'), booleanPng),
            fs.writeFile(
                path.join(goldenDirectory, 'candidate.png'), candidatePng),
            fs.writeFile(path.join(goldenDirectory, 'golden.png'), goldenPng),
            fs.writeFile(
                path.join(goldenDirectory, 'analysis.json'),
                JSON.stringify(analysis))
          ]);

          console.log(`🔎 Comparing <model-viewer> to ${golden.name}...`);
          console.log(
              `📊 Matching Pixels: ${(analysis.matching * 100).toFixed(1)}%`);
          console.log(`📊 Mean Color Distance (All Pixels): ${
              (analysis.averageDistance * 100).toFixed(1)}%`);
          console.log(`📊 Mean Color Distance (Non-matching Pixels): ${
              (analysis.notMatchingAverageDistance * 100).toFixed(1)}%`);
        }
      }

      await fs.writeFile(
          path.join(outputDirectory, 'config.json'), JSON.stringify(config));

      console.log(`✅ Results recorded to ${outputDirectory}`);

      server.close()
    });

import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',fullyParallel:false,workers:1,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,
  timeout:30000,expect:{timeout:8000},outputDir:'.test-artifacts/results',
  reporter:[['list'],['html',{outputFolder:'.test-artifacts/report',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure',screenshot:'only-on-failure',video:'off'},
  projects:[
    {name:'chromium-desktop',use:{browserName:'chromium',viewport:{width:1280,height:800}}},
    {name:'chromium-narrow',use:{browserName:'chromium',viewport:{width:390,height:844}}},
    {name:'webkit-smoke',testMatch:'**/*.smoke.spec.mjs',use:{browserName:'webkit',viewport:{width:1280,height:800}}}
  ],
  webServer:[
    {command:'node examples/migration-field-guide/serve.mjs',env:{AFD_DEMO_PORT:'3000'},url:'http://127.0.0.1:3000',reuseExistingServer:false,timeout:20000},
    {command:'node examples/nature-journal/serve.mjs',env:{AFD_DEMO_PORT:'3002'},url:'http://127.0.0.1:3002',reuseExistingServer:false,timeout:20000},
    {command:'node examples/motion-lab/serve.mjs',env:{AFD_DEMO_PORT:'3003'},url:'http://127.0.0.1:3003',reuseExistingServer:false,timeout:20000}
  ]
});

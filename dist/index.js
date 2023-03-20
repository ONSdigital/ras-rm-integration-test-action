/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 806:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 946:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 599:
/***/ ((module) => {

module.exports = eval("require")("@google-cloud/pubsub");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__nccwpck_require__.r(__webpack_exports__);
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const core = __nccwpck_require__(806);
const github = __nccwpck_require__(946);
const {PubSub} = __nccwpck_require__(599);

const NAMESPACE_POSITION = 1;
const PARAMS_POSITION = 2;
const CONFIG_BRANCH = "configBranch";
const DEPLOY = "/deploy"

const getInputs = () => {
  return {
    botToken: core.getInput('bot-token'),
    prNumber: `pr-${github.context.issue.number}`,
    spinnakerTopic: core.getInput('spinnaker-topic'),
    artifactBucket: core.getInput('artifact-bucket'),
    projectId: core.getInput('gcp-project'),
    commentBody: core.getInput("comment-body"),
    latestHelmChart: core.getInput("helm-chart")
  }
}

const run = async () => {
  try {
    const {botToken, prNumber, spinnakerTopic, 
      artifactBucket, projectId, commentBody, latestHelmChart} = getInputs()

    const namespace = commentBody.split(" ")[NAMESPACE_POSITION];
    let paramKey = "";
    let paramValue = "";
    let configBranch = "main";
    if (commentBody.split(" ").length > 2) {
      const params = commentBody.split(" ")[PARAMS_POSITION];
      if (params.startsWith(CONFIG_BRANCH)) {
        configBranch = params.split("=")[1];
      } else {
        paramKey = params.split("=")[0];
        paramValue = params.split("=")[1];
      }
    }


    const messageJson = {
      namespace,
      prNumber,
      paramKey,
      paramValue,
      actor: github.context.actor,
      configBranch,
      latestHelmChart
    }

    await publish(projectId, spinnakerTopic, artifactBucket, messageJson);

    const repo = github.context.repo.repo;
    const owner = github.context.repo.owner;

    const commentMessage = `Deploying to dev cluster with following parameters: \n- namespace: \`${namespace}\` 
      \n - tag: \`${prNumber}\` 
      \n - configBranch: \`${configBranch}\` 
      \n - paramKey: \`${paramKey}\` 
      \n - paramValue: \`${paramValue}\``;

    const octokit = github.getOctokit(botToken);

    core.info(`writing to ${owner}/${repo} for issue number ${github.context.issue.number}`);

    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: github.context.issue.number,
      body: commentMessage,
    })

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function publish(projectId, topicName, artifactBucket, messageJson) {
  const pubSubClient = new PubSub({projectId});

  core.info(`helm path: ${messageJson.latestHelmChart}`);

  const spinnakerMessage = {
    parameters: {
      service : "case",
      cluster: "dev",
      namespace: "babbal",
      feature: "@SEFT",
      tag: "pr-118"
    }
 }
  const data = JSON.stringify(spinnakerMessage);

  const dataBuffer = Buffer.from(data);

  try {
    const messageId = await pubSubClient.topic(topicName)
      .publish(dataBuffer, {
        ci: "acceptance-tests"
      });
    core.info(`Message ${messageId} published.`);
  } catch (error) {
    core.error(`Received error while publishing: ${error.message}`);
    core.setFailed(error.message);
  }
}

run()

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (run);
})();

module.exports = __webpack_exports__;
/******/ })()
;
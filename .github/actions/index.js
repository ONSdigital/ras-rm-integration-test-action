const core = require('@actions/core');

const main = async () => {
    commentBody = core.getInput("comment-body")
    let surveyModesToTest = ["SEFT", "EQ", "BRES", "EQANDSEFT"];
    try {
        const namespace = commentBody.split(" ")[1];
        if (commentBody.split(" ").length = 2) {
            surveyModesToTest = [commentBody.split(" ")[2]];
        }
    } catch (error) {
        setFailed(error.message);
    }

    const prNumber = core.getInput("pr-number");
    core.info(prNumber)
    core.info(surveyModesToTest)
}

main();


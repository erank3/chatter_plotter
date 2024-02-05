const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");


function extractContent(str) {
  // Regular expression to match the content between triple backticks
  const regex = /```(?:\w+\n)?([\s\S]*?)```/g;

  // Extracting the content using regex
  const match = regex.exec(str);
  if (match && match[1]) {
    return match[1].trim(); // Trim to remove any leading/trailing whitespace
  } else {
    return str; // Return null if no match is found
  }
}

const azureEndpoint = "https://llm-gpt-openai.openai.azure.com/";
const client = new OpenAIClient(
  azureEndpoint,
  new AzureKeyCredential("KEY_HERE")
);

module.exports = {
  /**
   * Creates a chat completion using the OpenAI API.
   * @param {Array} messages An array of message objects for the chat completion.
   * @param {boolean} jsonParse Whether to parse the response as JSON.
   * @param {Object} options Options for the chat completion, with defaults.
   * @param {Function} onStream Callback function to handle streaming data.
   * @returns {Promise<Object|string>} The chat completion response parsed as JSON or a string.
   */
  createChatCompletion: async function (
    messages,
    jsonParse = false,
    options = { temperature: 0.2, model: "gpt-4" },
    retry = false,
    onStream
  ) {
    // Override the model if not provided
    options.model = options.model || "gpt-4";

    const deploymentId = options.model === "gpt-4" ? "gpt-4" : "gpt-4-t";
    const shouldCleanResposne = deploymentId === "gpt-4-t";

    const createChatCompletionRequest = {
      deploymentId: deploymentId,
      messages: messages,
      stream: true,
      ...options,
    };

    const formattedLog = JSON.stringify(createChatCompletionRequest).replace(
      /\\n/g,
      "\n"
    );

    console.log(formattedLog);

    let responseString = "";
    try {
      const events = await client.streamChatCompletions(deploymentId, messages, {
        temperature: options.temperature,
        stream: true,
      });
    
      for await (const event of events) {
        for (const choice of event.choices) {
          const delta = choice.delta?.content;
          if (delta !== undefined) {
            process.stdout.write(delta);
            responseString += delta;

            if (onStream) {
              onStream(delta);
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
      const errorMsg = `listChatCompletions failed: ${JSON.stringify(error)}`;
      throw new Error(errorMsg);
    }

    console.log(
      `azure openAIClient listChatCompletions response: ${responseString}`
    );

    if (shouldCleanResposne) {
      // temp hack gpt-4-1106-preview	returns response in a weird format,
      responseString = extractContent(responseString);
    }
    if (jsonParse) {
      try {
        return JSON.parse(responseString);
      } catch (parseError) {
        console.log(
          `azure openAIClient createChatCompletion error: ${parseError}, retry:${retry}`
        );

        if (!retry) {
          throw new Error(`Error parsing JSON response: ${parseError.message}`);
        }

        const fixedResponse = await this.createChatCompletion(
          messages,
          jsonParse,
          options,
          false,
          onStream
        );

        console.log(
          `azure openAIClient createChatCompletion error fixedResponse: ${JSON.stringify(
            fixedResponse
          )}`
        );

        return fixedResponse;
      }
    }

    return responseString;
  },
};

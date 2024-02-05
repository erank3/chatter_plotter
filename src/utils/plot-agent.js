const fse = require("fs-extra");
const path = require("path");
const azureCient = require("./azureCient");

async function loadDescriptorsJSONFile() {
  try {
    const suffixJSONfilePath = path.join(
      __dirname,
      "../golem/",
      "schemas",
      "schema-variables.json"
    );
    const suffixJSON = fse.readFileSync(suffixJSONfilePath, {
      encoding: "utf8",
      flag: "r",
    });

    const variables = JSON.parse(suffixJSON);
  } catch (err) {
    console.error(`loadDescriptorsJSONFile failed error: ${err}`);
  }
}

function getQueryCreationPrompt(prompt) {
  let messages = [
    {
      role: "system",
      content:
        "You are a data analysis. you can only answer data related question and answer a JSON format.",
    },
  ];

  const responseJSON = `{
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The SQL query string with placeholders for parameters."
      },
      "params": {
        "type": "array",
        "description": "An array of parameters to be substituted in place of the query's placeholders.",
        "items": {
          "type": "string"
        }
      }
      ""
    },
    "required": ["query", "params"]
  }  `;

  const tableSchema = `CREATE TABLE shopping_centers_ft (
    day DATE COMMENT 'The date of the record',
    id VARCHAR(255) NOT NULL COMMENT 'The unique identifier of the
    shopping center',
    name VARCHAR(255) NOT NULL COMMENT 'The name of the shopping
    center',
    ft INT COMMENT 'The foot traffic at the shopping center',
    state CHAR(2) COMMENT 'The state code where the shopping center
    is located',
    city VARCHAR(255) COMMENT 'The city where the shopping center is
    located',
    formatted_address VARCHAR(255) COMMENT 'The full address of the
    shopping center',
    lon DECIMAL(10, 8) COMMENT 'The longitude coordinate of the
    shopping center',
    lat DECIMAL(10, 8) COMMENT 'The latitude coordinate of the
    shopping center',
    PRIMARY KEY (day, id)
    );`;

  content = `
  Build a matching SQLlite query for this prompt:
  ${prompt}

  * Make sure the query and functions executes on SQLite.
    * There is still no built-in stdev function in sqlite
    * don't use: tddev_pop.
    * don't use table aliases.
    * For any calculation involving aggregate functions, first compute the aggregates separately and then use these computed values in subsequent calculations to ensure accuracy and avoid errors.
    * Reference columns directly from the CTE in your final SELECT statement without prefixing them with the original table name.
    * Structure your query to calculate aggregate metrics in one Common Table Expression (CTE) and then reference these metrics for further calculations in subsequent CTEs, ensuring all necessary data is accessible and correctly scoped for each step of the analysis.
    * Qualify ambiguous column names with table aliases throughout your SQL query to resolve the "ambiguous column name" error.
  * return the query as single string with not formatting nor escaping.
  * if the purpose of the prompt is not dataRetrieval:
      * write the query for the data summarization process.
     * IMPORTANT: Do not return the full data; instead, provide a concise summary that facilitates data analysis.
  
  table schema: 
  ${tableSchema}
  
  Return a JSON matching the provided schema (return only the actual values while removing any field related to the schema):
  ${responseJSON}
  `;

  messages.push({
    role: "user",
    content: content,
  });

  return messages;
}

function getSummarizePrompt(results, userPrompt) {
  let messages = [
    {
      role: "system",
      content:
        "You are a data analysis. you can only answer data related question and answer a JSON format.",
    },
  ];

  const responseJSON = `{
    "type": "object",
    "properties": {
      "summary": {
        "type": "string",
        "description": "explain the data in natrual lanuage for a sale persons."
      }
      }
    },
    "required": ["summary"]
  }  `;

  const tableSchema = `CREATE TABLE shopping_centers_ft (
    day DATE COMMENT 'The date of the record',
    id VARCHAR(255) NOT NULL COMMENT 'The unique identifier of the
    shopping center',
    name VARCHAR(255) NOT NULL COMMENT 'The name of the shopping
    center',
    ft INT COMMENT 'The foot traffic at the shopping center',
    state CHAR(2) COMMENT 'The state code where the shopping center
    is located',
    city VARCHAR(255) COMMENT 'The city where the shopping center is
    located',
    formatted_address VARCHAR(255) COMMENT 'The full address of the
    shopping center',
    lon DECIMAL(10, 8) COMMENT 'The longitude coordinate of the
    shopping center',
    lat DECIMAL(10, 8) COMMENT 'The latitude coordinate of the
    shopping center',
    PRIMARY KEY (day, id)
    );`;

  content = `
  Explain and analyze the following results for a data analysts:
  ${results}


  the results are based on this user prompt:
  ${userPrompt}
  
  table schema: 
  ${tableSchema}
  
  Return a JSON matching the provided schema (return only the actual values while removing any field related to the schema):
  ${responseJSON}
  `;

  messages.push({
    role: "user",
    content: content,
  });

  return messages;
}

module.exports = {
  plot: async function (
    prompt,
    temperature = 0.1,
    model = "gpt-4-1106-preview"
  ) {
    const messages = getQueryCreationPrompt(prompt);

    const response = await azureCient.createChatCompletion(messages, true, {
      model: model,
      temperature: temperature,
    });

    return response;
  },

  chat: async function (
    dataResults,
    userPrompt,
    temperature = 0.1,
    model = "gpt-4-1106-preview"
  ) {
    const messages = getSummarizePrompt(dataResults, userPrompt);

    const response = await azureCient.createChatCompletion(messages, true, {
      model: model,
      temperature: temperature,
    });

    return response;
  },
};

loadDescriptorsJSONFile();

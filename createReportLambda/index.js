// createReportLambda/index.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto"; // For generating unique report IDs

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  let requestBody;
  try {
    // API Gateway might pass the body as a string, even if Content-Type is application/json
    // Handle cases where event.body might already be an object (e.g. direct Lambda test invoke)
    if (typeof event.body === 'string') {
        requestBody = JSON.parse(event.body);
    } else if (typeof event.body === 'object' && event.body !== null) {
        requestBody = event.body; // Already parsed (e.g. Lambda test console)
    } else {
        throw new Error("Request body is missing or not a string/object.");
    }
  } catch (error) {
    console.error("Malformed request body:", error);
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Invalid request body. Must be valid JSON." }),
    };
  }

  const { title, content } = requestBody;

  if (!title || !content) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Missing required fields: title and content." }),
    };
  }

  let ownerCognitoSub;
  try {
    // Path for Cognito authorizer claims when integrated with API Gateway HTTP API
    // For REST API, it might be event.requestContext.authorizer.claims.sub
    // For direct Lambda authorizer, it might be event.requestContext.authorizer.principalId or claims in authorizer object
    // Adjust this path based on your specific API Gateway setup (HTTP API vs REST API) and authorizer type
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.jwt && event.requestContext.authorizer.jwt.claims) {
        ownerCognitoSub = event.requestContext.authorizer.jwt.claims.sub; // Common for HTTP API with JWT authorizer
    } else if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        ownerCognitoSub = event.requestContext.authorizer.claims.sub; // Common for REST API with Cognito User Pool Authorizer
    }

    if (!ownerCognitoSub) {
      // Fallback or additional check if using Lambda authorizers directly
      if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.principalId) {
        // If principalId is the sub, use it. Otherwise, this indicates misconfiguration.
        // ownerCognitoSub = event.requestContext.authorizer.principalId; // Uncomment if principalId is the sub
      }
      // If still no ownerCognitoSub after checks
      if (!ownerCognitoSub) {
        throw new Error("User SUB (ownerCognitoSub) not found in authorizer claims.");
      }
    }
  } catch (error) {
    console.error("Error accessing user claims:", error);
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "User identity not found or not configured correctly in authorizer. Ensure request is authenticated." }),
    };
  }

  const reportId = randomUUID();
  const timestamp = new Date().toISOString();

  const newReport = {
    reportId,
    title,
    content,
    ownerCognitoSub, // The sub of the user creating the report
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const params = {
    TableName: REPORTS_TABLE_NAME,
    Item: newReport,
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log("Report created successfully:", newReport);
    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newReport),
    };
  } catch (error) {
    console.error("Error creating report in DynamoDB:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to create report.", error: error.message }),
    };
  }
};

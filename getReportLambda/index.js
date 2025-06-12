// getReportLambda/index.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  let reportId;
  try {
    // Check for pathParameters and then for reportId
    if (event.pathParameters && event.pathParameters.reportId) {
      reportId = event.pathParameters.reportId;
    } else {
      // Fallback for testing or different event structures, e.g., direct payload
      if (event.reportId) {
        reportId = event.reportId;
      } else {
        throw new Error("reportId not found in pathParameters or direct event properties.");
      }
    }
  } catch (error) {
    console.error("Error accessing reportId:", error.message);
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "reportId must be provided in the path or event." }),
    };
  }

  const params = {
    TableName: REPORTS_TABLE_NAME,
    Key: {
      reportId: reportId, // Ensure this matches the actual key name in your DynamoDB table
    },
  };

  try {
    const { Item } = await docClient.send(new GetCommand(params));

    if (Item) {
      console.log("Report retrieved successfully:", Item);
      return {
        statusCode: 200, // OK
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(Item),
      };
    } else {
      console.log("Report not found with ID:", reportId);
      return {
        statusCode: 404, // Not Found
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Report not found." }),
      };
    }
  } catch (error) {
    console.error("Error retrieving report from DynamoDB:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to retrieve report.", error: error.message }),
    };
  }
};

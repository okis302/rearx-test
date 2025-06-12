// deleteReportLambda/index.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb"; // Added GetCommand

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;

// Helper to get user claims (consistent with other lambdas)
const getUserClaims = (event) => {
    let userCognitoSub, userRole;
    // Adjust paths based on your API Gateway and authorizer setup
    if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.jwt && event.requestContext.authorizer.jwt.claims) {
        userCognitoSub = event.requestContext.authorizer.jwt.claims.sub;
        userRole = event.requestContext.authorizer.jwt.claims['custom:role'];
    } else if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
        userCognitoSub = event.requestContext.authorizer.claims.sub;
        userRole = event.requestContext.authorizer.claims['custom:role'];
    }
    if (!userCognitoSub) {
        throw new Error("User SUB (ownerCognitoSub) not found in authorizer claims.");
    }
    return { userCognitoSub, userRole };
};

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  let reportId;
  try {
    if (event.pathParameters && event.pathParameters.reportId) {
        reportId = event.pathParameters.reportId;
    } else {
        throw new Error("reportId not found in path parameters.");
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "reportId must be provided in the path." }),
    };
  }

  let userCognitoSub, userRole;
  try {
    ({ userCognitoSub, userRole } = getUserClaims(event));
  } catch (error) {
    console.error("Error accessing user claims:", error.message);
    return {
      statusCode: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "User identity not found or not configured correctly. Ensure request is authenticated." }),
    };
  }

  // First, check if the item exists to provide a more specific 404 error if it doesn't.
  // This is similar to the updateLambda for better API responses.
  const getItemParams = {
      TableName: REPORTS_TABLE_NAME,
      Key: { reportId: reportId },
  };

  try {
      const { Item: existingItem } = await docClient.send(new GetCommand(getItemParams));
      if (!existingItem) {
          return {
              statusCode: 404,
              headers: { "Access-Control-Allow-Origin": "*" },
              body: JSON.stringify({ message: "Report not found." }),
          };
      }

      // If item exists, proceed with conditional delete
      // Condition: user is owner OR user is administrator. Item existence is already confirmed.
      const conditionExpression = "(ownerCognitoSub = :userSub OR :userRole = :adminRole)";
      const expressionAttributeValues = {
        ":userSub": userCognitoSub,
        ":userRole": userRole || "general", // Default role if not present for safety in condition
        ":adminRole": "administrator",
      };

      const deleteParams = {
        TableName: REPORTS_TABLE_NAME,
        Key: {
          reportId: reportId,
        },
        ConditionExpression: conditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      await docClient.send(new DeleteCommand(deleteParams));
      console.log("Report deleted successfully:", reportId);
      return {
        statusCode: 204, // No Content
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: '',
      };

  } catch (error) {
    console.error("Error during delete operation:", error);
    if (error.name === "ConditionalCheckFailedException") {
      // This now specifically means the user is not the owner and not an admin,
      // because we've already checked for item existence.
      return {
        statusCode: 403, // Forbidden
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Delete failed. You don't have permission to delete this report." }),
      };
    }
    // Handle cases where GetCommand might fail for reasons other than item not found (e.g. table issues)
    // or if DeleteCommand fails for other reasons.
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to delete report.", error: error.message }),
    };
  }
};

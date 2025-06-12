// updateReportLambda/index.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"; // Added GetCommand

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;

// Helper to get user claims
const getUserClaims = (event) => {
    let userCognitoSub, userRole;
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

  let requestBody;
  try {
    if (typeof event.body === 'string') {
        requestBody = JSON.parse(event.body);
    } else if (typeof event.body === 'object' && event.body !== null) {
        requestBody = event.body;
    } else {
        throw new Error("Request body is missing or not a string/object.");
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Invalid request body. Must be valid JSON." }),
    };
  }

  const { title, content } = requestBody;

  if (!title && !content) {
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Missing fields to update. Provide at least title or content." }),
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

  const timestamp = new Date().toISOString();

  let updateExpressionParts = ["updatedAt = :updatedAt"];
  const expressionAttributeValues = { ":updatedAt": timestamp };
  // No ExpressionAttributeNames needed unless using reserved words for attribute names (not keys).

  if (title !== undefined) { // Check for undefined to allow sending empty string
    updateExpressionParts.push("title = :title");
    expressionAttributeValues[":title"] = title;
  }
  if (content !== undefined) {
    updateExpressionParts.push("content = :content");
    expressionAttributeValues[":content"] = content;
  }

  const updateExpression = "SET " + updateExpressionParts.join(", ");

  const conditionExpression = "(ownerCognitoSub = :userSub OR :userRole = :adminRole)";
  expressionAttributeValues[":userSub"] = userCognitoSub;
  expressionAttributeValues[":userRole"] = userRole || "general"; // Default role if not present for safety
  expressionAttributeValues[":adminRole"] = "administrator";

  // Add attribute_exists(reportId) to ensure we are updating an existing item.
  // This is implicitly handled by UpdateItem if Key is present, but explicit check is clearer with condition.
  // However, the main condition is for ownership/role. A separate GetItem check is better for 404.

  const params = {
    TableName: REPORTS_TABLE_NAME,
    Key: { reportId: reportId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ConditionExpression: conditionExpression,
    ReturnValues: "ALL_NEW",
  };

  try {
    // First, check if the item exists to provide a more specific 404 error.
    // This adds an extra read but improves API response clarity.
    const getItemParams = {
        TableName: REPORTS_TABLE_NAME,
        Key: { reportId: reportId },
    };
    const { Item: existingItem } = await docClient.send(new GetCommand(getItemParams));

    if (!existingItem) {
        return {
            statusCode: 404,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "Report not found." }),
        };
    }

    // If item exists, proceed with conditional update
    const { Attributes } = await docClient.send(new UpdateCommand(params));
    console.log("Report updated successfully:", Attributes);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error("Error updating report in DynamoDB:", error);
    if (error.name === "ConditionalCheckFailedException") {
      // This now specifically means the user is not the owner and not an admin,
      // because we've already checked for item existence.
      return {
        statusCode: 403, // Forbidden
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Update failed. You don't have permission to update this report." }),
      };
    }
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to update report.", error: error.message }),
    };
  }
};

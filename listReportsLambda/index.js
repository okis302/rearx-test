// listReportsLambda/index.js
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REPORTS_TABLE_NAME = process.env.REPORTS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));
  // No specific pathParameters or requestBody expected for listing all reports initially.
  // Cognito claims could be used for filtering by owner in a future enhancement.
  // Example: Accessing Cognito sub if needed for filtering (ensure authorizer setup)
  // let ownerCognitoSub;
  // try {
  //   if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.jwt && event.requestContext.authorizer.jwt.claims) {
  //       ownerCognitoSub = event.requestContext.authorizer.jwt.claims.sub;
  //   } else if (event.requestContext && event.requestContext.authorizer && event.requestContext.authorizer.claims) {
  //       ownerCognitoSub = event.requestContext.authorizer.claims.sub;
  //   }
  // } catch (error) {
  //   console.warn("Could not extract ownerCognitoSub for potential filtering:", error.message);
  // }

  const params = {
    TableName: REPORTS_TABLE_NAME,
    // Add ProjectionExpression if you only want specific attributes to reduce data transfer
    // Example: Only get reportId, title, and createdAt
    // ProjectionExpression: "reportId, title, createdAt, ownerCognitoSub"
  };

  // If filtering by ownerCognitoSub (for example, if only admins see all, others see their own)
  // if (ownerCognitoSub && !IS_ADMIN_ROLE) { // IS_ADMIN_ROLE would need to be determined from claims
  //   params.FilterExpression = "ownerCognitoSub = :ownerSub";
  //   params.ExpressionAttributeValues = {
  //     ":ownerSub": ownerCognitoSub,
  //   };
  // }
  // Note: Using FilterExpression on a Scan is still inefficient.
  // A GSI on ownerCognitoSub would be better for "list my reports" functionality.

  try {
    // Scan operation can be inefficient on large tables.
    // Consider using Query with a GSI for more optimized access patterns if needed.
    const { Items, Count, ScannedCount } = await docClient.send(new ScanCommand(params));

    console.log(`Reports retrieved. Count: ${Count}, ScannedCount: ${ScannedCount}`);
    return {
      statusCode: 200, // OK
      headers: {
        "Access-Control-Allow-Origin": "*", // Adjust for production
        "Content-Type": "application/json"
      },
      body: JSON.stringify(Items || []), // Return empty array if Items is undefined
    };
  } catch (error) {
    console.error("Error retrieving reports from DynamoDB (Scan):", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to retrieve reports.", error: error.message }),
    };
  }
};

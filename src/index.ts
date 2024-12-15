import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { fetchWebpageContent } from "./utils/fetchContent";
import { AzureOpenAI } from "openai";
import dotenv from 'dotenv';

const app = express();
app.use(bodyParser.json());
dotenv.config();


const client = new AzureOpenAI({
    endpoint: process.env.AZURE_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_KEY,
    deployment: process.env.AZURE_DEPLOYMENT,
    apiVersion: "2024-05-01-preview",
});

// Compliance checking function
async function checkComplianceAgainstPolicy(
    pageContent: string,
    policyContent: string
): Promise<{
    compliant: boolean;
    findings: string[];
}> {
    try {
        // Use OpenAI to analyze compliance
        const response = await client.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a compliance expert. Analyze the webpage content against the detailed compliance policy. 
                    Conduct a thorough line-by-line comparison.
                    Identify any specific violations or areas of non-compliance.
                    Return a JSON object with:
                    - compliant: boolean (overall compliance status)
                    - findings: string[] (detailed non-compliance findings)`,
                },
                {
                    role: "user",
                    content: `
                    COMPLIANCE POLICY DETAILS:
                    ${policyContent}

                    WEBPAGE CONTENT TO CHECK:
                    ${pageContent}

                    Carefully analyze the content for any violations of the policy. 
                    Provide specific, detailed findings that highlight where and how the content might not align with the policy.
                    Be precise and comprehensive in your assessment.`,
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 750,
        });

        // Parse the response
        const complianceResult = JSON.parse(
            response.choices[0].message.content || "{}"
        );

        return {
            compliant: complianceResult.compliant || false,
            findings: complianceResult.findings || ["Unable to determine compliance"],
        };
    } catch (error) {
        console.error("Compliance check error:", error);
        throw new Error("Failed to perform compliance check");
    }
}

// Compliance checking route
app.post("/check-compliance", async (req: Request, res: any) => {
    try {
        const {
            pageUrl,
            policyUrl = "https://stripe.com/docs/treasury/marketing-treasury",
        } = req.body;

        // Validate inputs
        if (!pageUrl) {
            return res.status(400).json({
                error: "Page URL is required",
            });
        }

        // Fetch both webpage and policy content
        const [pageContent, policyContent] = await Promise.all([
            fetchWebpageContent(pageUrl),
            fetchWebpageContent(policyUrl),
        ]);

        // Check compliance
        const complianceResult = await checkComplianceAgainstPolicy(
            pageContent?.body,
            policyContent?.body
        );

        // Return comprehensive results
        res.json({
            url: pageUrl,
            policyUrl,
            pageContentLength: pageContent?.body.length,
            policyContentLength: policyContent?.body.length,
            ...complianceResult,
        });
    } catch (error) {
        console.error("Compliance check route error:", error);
        res.status(500).json({
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const PII_DETECTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    pii_found: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "Type of PII (e.g., Name, Email, SSN, Credit Card)" },
          value: { type: Type.STRING, description: "The actual PII value found" },
          startIndex: { type: Type.INTEGER, description: "Start index in the text" },
          endIndex: { type: Type.INTEGER, description: "End index in the text" },
          risk_level: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
        },
        required: ["type", "value", "startIndex", "endIndex", "risk_level"],
      },
    },
    summary: { type: Type.STRING, description: "A brief summary of the privacy risks found" },
    risk_score: { type: Type.INTEGER, description: "Overall privacy risk score from 0 to 100" },
  },
  required: ["pii_found", "summary", "risk_score"],
};

export async function detectPII(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following text for Personally Identifiable Information (PII) and privacy risks. 
    Identify all sensitive data and provide their locations in the text.
    
    Text:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: PII_DETECTION_SCHEMA,
    },
  });

  return JSON.parse(response.text);
}

export async function analyzePrivacyPolicy(policy: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following privacy policy for GDPR and CCPA compliance. 
    Identify missing clauses, deceptive language, or high-risk data practices.
    Provide a score and a list of recommendations.
    
    Policy:
    ${policy}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          compliance_score: { type: Type.INTEGER },
          gdpr_compliant: { type: Type.BOOLEAN },
          ccpa_compliant: { type: Type.BOOLEAN },
          findings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                issue: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                recommendation: { type: Type.STRING },
              },
              required: ["issue", "severity", "recommendation"],
            },
          },
          summary: { type: Type.STRING },
        },
        required: ["compliance_score", "gdpr_compliant", "ccpa_compliant", "findings", "summary"],
      },
    },
  });

  return JSON.parse(response.text);
}

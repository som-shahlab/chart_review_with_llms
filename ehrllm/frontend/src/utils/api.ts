import { Message } from "@/types";
const API_BASE_URL = "http://127.0.0.1:5001/api";

export const getPatientInfo = async (patientId: string, settings: any) => {
    try {
        const response = await fetch(`${API_BASE_URL}/patient/${patientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ settings }),
        });
        return response.json();
    } catch (error) {
        console.error('Error fetching patient info:', error);
        return { error: 'Error fetching patient info' };
    }
}

export const getChatResponse = async (patientId: string, messages: Message[], settings: any) => {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                patientId, 
                messages, 
                settings, 
                isUseCache: true, // TODO: make this configurable
            }),
        });
        return response.json();
    } catch (error) {
        console.error('Error fetching chat response:', error);
        return { error: 'Error fetching chat response' };
    }
}
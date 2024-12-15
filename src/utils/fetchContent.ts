import axios from 'axios';
import * as cheerio from 'cheerio';

export const fetchWebpageContent = async (url: string): Promise<{ body: string }> => {
    try {
        // More comprehensive set of headers to mimic a real browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };

        // Use axios with more comprehensive configuration
        const response = await axios.get(url, {
            headers,
            timeout: 10000, // 10 second timeout
            maxRedirects: 5, // Follow up to 5 redirects
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Default
            }
        });

        // Use Cheerio to parse the HTML
        const $ = cheerio.load(response.data);

        // Advanced text extraction strategy
        let body = '';

        // Try multiple selectors to extract main content
        const contentSelectors = [
            'article',
            'main',
            'body',
            '#main-content',
            '.content',
            '#content'
        ];

        for (const selector of contentSelectors) {
            const content = $(selector).text().trim();
            if (content) {
                body = content;
                break;
            }
        }

        // If no content found, fall back to entire body text
        if (!body) {
            body = $('body').text().trim();
        }

        // Remove excessive whitespace
        body = body.replace(/\s+/g, ' ');

        return { body };
    } catch (error: any) {
        console.error('Comprehensive fetch error:', error);

        // More detailed error handling
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('Data:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            throw new Error(`Fetch failed with status ${error.response.status}`);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request made but no response:', error.request);
            throw new Error('No response received from the server');
        } else {
            // Something happened in setting up the request
            console.error('Error setting up request:', error.message);
            throw new Error(`Error in request setup: ${error.message}`);
        }
    }
};
import { httpClient } from '../../client.js';
export const categoryListHandler = async (uri, _options) => {
    try {
        const categoryList = await httpClient.fetchURL({
            path: '/v2/integration/categories',
        });
        return {
            contents: [
                {
                    type: 'text',
                    uri: uri.href,
                    text: `The following is a single category represented in the order:
[category uuid, label of category]`,
                },
                {
                    type: 'text',
                    uri: uri.href,
                    text: categoryList
                        .map((category) => [category.categoryUUID, category.label])
                        .join(','),
                },
            ],
        };
    }
    catch (error) {
        console.error('Error in resource handler:', error);
        return {
            contents: [
                {
                    type: 'text',
                    uri: uri.href,
                    text: `Error in resource handler: ${error}`,
                },
            ],
        };
    }
};

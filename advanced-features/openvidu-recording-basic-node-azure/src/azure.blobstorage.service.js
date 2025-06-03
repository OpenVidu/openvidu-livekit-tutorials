import {
    BlobServiceClient,
    StorageSharedKeyCredential,
} from "@azure/storage-blob";

// Azure configuration
const AZURE_ACCOUNT_NAME = process.env.AZURE_ACCOUNT_NAME || "devstoreaccount";
const AZURE_ACCOUNT_KEY =
    process.env.AZURE_ACCOUNT_KEY || "nokey";
const AZURE_CONTAINER_NAME =
    process.env.AZURE_CONTAINER_NAME || "openvidu-appdata";

const AZURE_ENDPOINT =
    process.env.AZURE_ENDPOINT ||
    `https://${AZURE_ACCOUNT_NAME}.blob.core.windows.net`;

export class AzureBlobService {
    static instance;

    constructor() {
        if (AzureBlobService.instance) {
            return AzureBlobService.instance;
        }

        const sharedKeyCredential = new StorageSharedKeyCredential(
            AZURE_ACCOUNT_NAME,
            AZURE_ACCOUNT_KEY
        );

        this.blobServiceClient = new BlobServiceClient(
            AZURE_ENDPOINT,
            sharedKeyCredential
        );

        this.containerClient = this.blobServiceClient.getContainerClient(
            AZURE_CONTAINER_NAME
        );

        AzureBlobService.instance = this;
        return this;
    }

    async exists(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        return await blobClient.exists();
    }

    async getObjectSize(key) {
        const props = await this.headObject(key);
        return props.contentLength;
    }

    async headObject(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        const props = await blobClient.getProperties();
        return props;
    }

    async getObject(key, range) {
        const blobClient = this.containerClient.getBlobClient(key);
        const downloadOptions = range
            ? {
                rangeGetContentMD5: false,
                range: {
                    offset: range.start,
                    count: range.end - range.start + 1,
                },
            }
            : {};

        const response = await blobClient.download(
            downloadOptions.range?.offset ?? 0,
            downloadOptions.range?.count
        );

        return response.readableStreamBody;
    }

    async listObjects() {
        const result = [];
        for await (const blob of this.containerClient.listBlobsFlat()) {
            result.push(blob);
        }
        return result;
    }

    async deleteObject(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        return await blobClient.deleteIfExists();
    }
}

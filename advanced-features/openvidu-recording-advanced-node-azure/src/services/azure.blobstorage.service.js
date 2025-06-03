import {
    BlobServiceClient,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
    SASProtocol
} from "@azure/storage-blob";
import {
    AZURE_CONTAINER_NAME,
    AZURE_ACCOUNT_NAME,
    AZURE_ACCOUNT_KEY,
    AZURE_ENDPOINT
} from "../config.js";

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

    static getInstance() {
        if (!AzureBlobService.instance) {
            AzureBlobService.instance = new AzureBlobService();
        }
        return AzureBlobService.instance;
    }

    // Sube un objeto (JSON) al contenedor
    async uploadObject(key, body) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(key);
        const data = JSON.stringify(body);
        await blockBlobClient.upload(data, Buffer.byteLength(data));
    }

    // Comprueba si existe un blob
    async exists(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        return await blobClient.exists();
    }

    // Obtiene las propiedades del blob (equivalente a headObject)
    async headObject(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        return await blobClient.getProperties();
    }

    // Devuelve el tamaño del blob en bytes
    async getObjectSize(key) {
        const props = await this.headObject(key);
        return props.contentLength || 0;
    }

    // Descarga el blob completo o un rango, devolviendo el stream
    async getObject(key, range) {
        const blobClient = this.containerClient.getBlobClient(key);
        let downloadResponse;
        if (range) {
            // range = { start: number, end: number }
            const count = range.end - range.start + 1;
            downloadResponse = await blobClient.download(range.start, count);
        } else {
            downloadResponse = await blobClient.download();
        }
        if (!downloadResponse.readableStreamBody) {
            throw new Error("No se pudo obtener el stream del blob");
        }
        return downloadResponse.readableStreamBody;
    }

    // Genera un URL SAS válido 24 horas
    async getObjectUrl(key) {
        if (!AZURE_ACCOUNT_NAME || !AZURE_ACCOUNT_KEY) {
            throw new Error("Credenciales de cuenta de Azure no están definidas para generar SAS");
        }
        const blobClient = this.containerClient.getBlobClient(key);
        const expiresOn = new Date(new Date().valueOf() + 24 * 60 * 60 * 1000); // 24 horas
        const sasPermissions = BlobSASPermissions.parse("r");
        const sasToken = generateBlobSASQueryParameters(
            {
                containerName: AZURE_CONTAINER_NAME,
                blobName: key,
                expiresOn,
                permissions: sasPermissions,
                protocol: SASProtocol.Https
            },
            new StorageSharedKeyCredential(AZURE_ACCOUNT_NAME, AZURE_ACCOUNT_KEY)
        ).toString();

        return `${blobClient.url}?${sasToken}`;
    }

    // Obtiene el contenido JSON del blob
    async getObjectAsJson(key) {
        const exists = await this.exists(key);
        if (!exists) {
            return undefined;
        }
        const stream = await this.getObject(key);
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on("data", (data) => {
                chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
            });
            stream.on("end", () => {
                const content = Buffer.concat(chunks).toString("utf-8");
                resolve(JSON.parse(content));
            });
            stream.on("error", reject);
        });
    }

    // Lista blobs bajo un prefijo y filtra por expresión regular
    async listObjects(prefix, regex) {
        const results = [];
        for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
            if (blob.name && regex.test(blob.name)) {
                results.push(blob.name);
            }
        }
        return results;
    }

    // Elimina un blob
    async deleteObject(key) {
        const blobClient = this.containerClient.getBlobClient(key);
        await blobClient.delete();
    }
}

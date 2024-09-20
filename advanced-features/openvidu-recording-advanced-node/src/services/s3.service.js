import {
    S3Client,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
    PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AWS_REGION, S3_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT, S3_SECRET_KEY } from "../config.js";

export class S3Service {
    static instance;

    constructor() {
        if (S3Service.instance) {
            return S3Service.instance;
        }

        this.s3Client = new S3Client({
            endpoint: S3_ENDPOINT,
            credentials: {
                accessKeyId: S3_ACCESS_KEY,
                secretAccessKey: S3_SECRET_KEY
            },
            region: AWS_REGION,
            forcePathStyle: true
        });

        S3Service.instance = this;
        return this;
    }

    async uploadObject(key, body) {
        const params = {
            Bucket: S3_BUCKET,
            Key: key,
            Body: JSON.stringify(body)
        };
        const command = new PutObjectCommand(params);
        return this.run(command);
    }

    async exists(key) {
        try {
            await this.headObject(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    async headObject(key) {
        const params = {
            Bucket: S3_BUCKET,
            Key: key
        };
        const command = new HeadObjectCommand(params);
        return this.run(command);
    }

    async getObjectSize(key) {
        const { ContentLength: size } = await this.headObject(key);
        return size;
    }

    async getObject(key, range) {
        const params = {
            Bucket: S3_BUCKET,
            Key: key,
            Range: range ? `bytes=${range.start}-${range.end}` : undefined
        };
        const command = new GetObjectCommand(params);
        const { Body: body } = await this.run(command);
        return body;
    }

    async getObjectUrl(key) {
        const params = {
            Bucket: S3_BUCKET,
            Key: key
        };
        const command = new GetObjectCommand(params);
        return getSignedUrl(this.s3Client, command, { expiresIn: 86400 }); // 24 hours
    }

    async getObjectAsJson(key) {
        const body = await this.getObject(key);
        const stringifiedData = await body.transformToString();
        return JSON.parse(stringifiedData);
    }

    async listObjects(prefix, regex) {
        const params = {
            Bucket: S3_BUCKET,
            Prefix: prefix
        };
        const command = new ListObjectsV2Command(params);
        const { Contents: objects } = await this.run(command);

        // Filter objects by regex and return the keys
        return objects?.filter((object) => regex.test(object.Key)).map((payload) => payload.Key) ?? [];
    }

    async deleteObject(key) {
        const params = {
            Bucket: S3_BUCKET,
            Key: key
        };
        const command = new DeleteObjectCommand(params);
        return this.run(command);
    }

    async run(command) {
        return this.s3Client.send(command);
    }
}

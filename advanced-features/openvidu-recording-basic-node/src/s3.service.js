import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

// S3 configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET || "openvidu-appdata";

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
        secretAccessKey: S3_SECRET_KEY,
      },
      region: AWS_REGION,
      forcePathStyle: true,
    });

    S3Service.instance = this;
    return this;
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
      Key: key,
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
      Range: range ? `bytes=${range.start}-${range.end}` : undefined,
    };
    const command = new GetObjectCommand(params);
    const { Body: body } = await this.run(command);
    return body;
  }

  async listObjects(prefix) {
    const params = {
      Bucket: S3_BUCKET,
      Prefix: prefix,
    };
    const command = new ListObjectsV2Command(params);
    return await this.run(command);
  }

  async deleteObject(key) {
    const params = {
      Bucket: S3_BUCKET,
      Key: key,
    };
    const command = new DeleteObjectCommand(params);
    return this.run(command);
  }

  async run(command) {
    return this.s3Client.send(command);
  }
}

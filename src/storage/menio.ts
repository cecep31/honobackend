import * as Minio from 'minio'

export const minioClient = new Minio.Client({
    endPoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION!,
    port: 443,
    useSSL: true,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,

})
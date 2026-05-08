
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import {KMSClient, EncryptCommand, DecryptCommand} from '@aws-sdk/client-kms'

let _kmsClient: KMSClient | null = null

function getKMSClient(): KMSClient {
    if (_kmsClient) return _kmsClient
    _kmsClient = new KMSClient({
        region: process.env.AWS_REGION!,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    })
    return _kmsClient
}

const KMS_KEY_ID = () => {
    const id = process.env.AWS_KMS_KEY_ID
    if (!id) throw new Error('[kms] Missing AWS_KMS_KEY_ID')
    return id
}

// ── AES-256-GCM helpers ────────────────────────────────────────────────────

function aesEncrypt(plaintext: string, key: Buffer): string {
    const iv = randomBytes(12)                       // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()                   // 128-bit auth tag

    // Format: base64(iv + authTag + ciphertext)
    return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

function aesDecrypt(payload: string, key: Buffer): string {
    const buf = Buffer.from(payload, 'base64')
    const iv = buf.subarray(0, 12)
    const authTag = buf.subarray(12, 28)
    const encrypted = buf.subarray(28)

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}



export interface EncryptedKey {
    encryptedPrivateKey: string
    encryptedDek: string
}


export async function encryptPrivateKey(privateKey: string): Promise<EncryptedKey> {
    const kms = getKMSClient()

    // 1. Generate a random 256-bit DEK
    const dek = randomBytes(32)

    // 2. Encrypt the private key locally with the DEK
    const encryptedPrivateKey = aesEncrypt(privateKey, dek)

    // 3. Encrypt the DEK with KMS
    const { CiphertextBlob } = await kms.send(
        new EncryptCommand({
            KeyId: KMS_KEY_ID(),
            Plaintext: dek,
        }),
    )

    if (!CiphertextBlob) throw new Error('[kms] KMS encrypt returned no ciphertext')

    const encryptedDek = Buffer.from(CiphertextBlob).toString('base64')
    dek.fill(0)

    return { encryptedPrivateKey, encryptedDek }
}


export async function decryptPrivateKey(
    encryptedPrivateKey: string,
    encryptedDek: string,
): Promise<string> {
    const kms = getKMSClient()
    const { Plaintext } = await kms.send(
        new DecryptCommand({
            KeyId: KMS_KEY_ID(),
            CiphertextBlob: Buffer.from(encryptedDek, 'base64'),
        }),
    )

    if (!Plaintext) throw new Error('[kms] KMS decrypt returned no plaintext')

    const dek = Buffer.from(Plaintext)
    const privateKey = aesDecrypt(encryptedPrivateKey, dek)
    dek.fill(0)

    return privateKey
}
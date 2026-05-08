import { type NextRequest } from 'next/server'
import { handleAlchemyWebhook } from '../_handler'

export const POST = (req: NextRequest) =>
    handleAlchemyWebhook(req, 'ALCHEMY_WEBHOOK_SECRET_ETH', 1)

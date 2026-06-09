export enum QueueName {
    NOTIFICATION = 'notification',
    EMAIL = 'email',
    SMS = 'sms',
    PUSH = 'push',
    PRODUCT_INDEX = 'product-index',
}

export enum JobName {
    PROCESS_NOTIFICATION = 'process_notification',
    SEND_EMAIL = 'send_email',
    SEND_SMS = 'send_sms',
    SEND_PUSH = 'send_push',
    INDEX_PRODUCT = 'index_product',
    REMOVE_PRODUCT = 'remove_product',
}

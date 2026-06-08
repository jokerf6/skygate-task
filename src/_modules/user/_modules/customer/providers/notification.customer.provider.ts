import { EVENTS } from '@prisma/client';
const Templates = {
  order_created_template: {
    en: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hello {{name}} 👋</h2>
        <p>Your order <strong>#{{orderId}}</strong> has been created successfully.</p>
        <p>Thank you for shopping with us!</p>

        <a href="{{orderLink}}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Order Details
        </a>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Best regards,<br>
          {{appName}} Team
        </p>
      </div>
    `,

    ar: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
        <h2 style="color: #333;">مرحبا {{name}} 👋</h2>
        <p>نشكرك على انضمامك إلينا في <strong>{{appName}}</strong>!</p>
        <p>تم إنشاء طلبك رقم <strong>#{{orderId}}</strong> بنجاح.</p>

        <a href="{{orderLink}}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          عرض تفاصيل الطلب
        </a>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          مع تحيات<br>
          فريق {{appName}}
        </p>
      </div>
    `
  },

  welcome_template: {
    en: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome {{name}}! 🎉</h2>
        <p>Thank you for joining <strong>{{appName}}</strong>.</p>
        <p>We're excited to have you with us. You can now explore all our services.</p>

        <a href="{{loginLink}}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Go to My Account
        </a>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          Best regards,<br>
          {{appName}} Team
        </p>
      </div>
    `,

    ar: `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right;">
        <h2 style="color: #333;">مرحبا {{name}}! 🎉</h2>
        <p>نشكرك على انضمامك إلينا في <strong>{{appName}}</strong>!</p>
        <p>يمكنك الآن تسجيل الدخول والاستفادة من كل الخدمات المتوفرة.</p>

        <a href="{{loginLink}}"
           style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          الذهاب إلى حسابي
        </a>

        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          مع تحيات<br>
          فريق {{appName}}
        </p>
      </div>
    `
  }
};

export const CustomerNotification = [
  {
    id: "test-1",
    title: { en: 'Order Created', ar: 'تم إنشاء الطلب' },
    body: { en: 'Your order has been created successfully.', ar: 'تم إنشاء طلبك بنجاح.' },
    emailAllowed: true,
    smsAllowed: false,
    notificationAllowed: false,
    emailTemplate: Templates.order_created_template,
    event: EVENTS.CREATE_ORDER,
    receiverId: 'CUSTOMER',
    createdAt: new Date(),
    deletedAt: null,
  },
  {
    id: "test-2",
    title: { en: 'Welcome', ar: 'مرحبا' },
    body: { en: 'Welcome to our service!', ar: 'مرحبا بكم في خدمتنا!' },
    emailAllowed: true,
    smsAllowed: false,
    notificationAllowed: false,
    emailTemplate: Templates.welcome_template,
    event: EVENTS.LOGIN,
    receiverId: 'CUSTOMER',
    createdAt: new Date(),
    deletedAt: null,
  },
];

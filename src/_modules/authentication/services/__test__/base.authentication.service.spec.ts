import { Test, TestingModule } from '@nestjs/testing';
import { BaseAuthenticationService } from '../base.authentication.service';
import { PrismaService } from 'src/globals/services/prisma.service';
import { TokenService } from '../jwt.service';
import { HelperService } from 'src/_modules/user/services/helper.service';
import { UserService } from 'src/_modules/user/services/user.service';
import { OTPService } from '../otp.service';
import { getQueueToken } from '@nestjs/bull';
import { QueueName, JobName } from 'src/app/_modules/worker/worker.constants';

describe('BaseAuthenticationService', () => {
    let service: BaseAuthenticationService;
    let prisma: PrismaService;
    let notificationQueue: any;

    const mockPrisma = {
        devices: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        systemNotification: {
            findMany: jest.fn(),
        },
        language: {
            findFirst: jest.fn(),
        }
    };

    const mockQueue = {
        add: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BaseAuthenticationService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: TokenService, useValue: {} },
                { provide: HelperService, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: OTPService, useValue: {} },
                { provide: getQueueToken(QueueName.NOTIFICATION), useValue: mockQueue },
            ],
        }).compile();

        service = module.get<BaseAuthenticationService>(BaseAuthenticationService);
        prisma = module.get<PrismaService>(PrismaService);
        notificationQueue = module.get(getQueueToken(QueueName.NOTIFICATION));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should send notification when a new device is saved', async () => {
        mockPrisma.devices.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue({ id: 1, roleKey: 'Customer' });
        mockPrisma.systemNotification.findMany.mockResolvedValue([{ id: 1, event: 'auth/new_device_login' }]);
        mockPrisma.language.findFirst.mockResolvedValue({ key: 'ar' });

        await service.saveDevice('new-device-id', 1, 'ar');

        expect(notificationQueue.add).toHaveBeenCalledWith(
            JobName.PROCESS_NOTIFICATION,
            expect.objectContaining({
                languageId: 'ar',
                targetUsers: expect.arrayContaining([expect.objectContaining({ id: 1, roleKey: 'Customer' })]),
            })
        );
    });

    it('should NOT send notification when an existing device is saved', async () => {
        mockPrisma.devices.findUnique.mockResolvedValue({ userId: 1, deviceId: 'existing-id' });

        await service.saveDevice('existing-id', 1, 'ar');

        expect(notificationQueue.add).not.toHaveBeenCalled();
    });
});

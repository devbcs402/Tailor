import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { OrderCounter } from '../models/OrderCounter.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailor_management';

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected.');

    // 1. Seed or update Admin User
    const adminEmail = 'admin@tailor.com';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const passwordHash = await User.hashPassword('admin123');
      admin = await User.create({
        name: 'Yash Tailor (Master Tailor)',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        shopName: 'Silai Master Tailor Studio',
      });
      console.log('[Seed] Admin user created: admin@tailor.com / admin123');
    } else {
      admin.name = 'Yash Tailor (Master Tailor)';
      admin.shopName = 'Silai Master Tailor Studio';
      await admin.save();
      console.log('[Seed] Admin user updated with English name.');
    }

    // 2. Clear & re-seed sample customers and orders with English text
    await Customer.deleteMany({});
    await Order.deleteMany({});
    await OrderCounter.deleteMany({});

    console.log('[Seed] Creating sample customers in English...');
    const customersData = [
      {
        name: 'Ramesh Patel',
        mobileNumber: '9876543210',
        address: '12, Sardar Chowk, Navrangpura, Ahmedabad',
        notes: 'Regular customer, prefers slim fit trousers',
        latestMeasurements: {
          unit: 'inch',
          shirt: {
            length: '28.5',
            chest: '40',
            waist: '36',
            shoulder: '18',
            sleeveLength: '24',
            sleeveOpening: '9.5',
            neck: '15.5',
            frontChest: '19.5',
            notes: 'Use stiff buckram in collar',
          },
          shirtPattern: 'checks',
          shirtCustomPattern: '',
          pant: {
            length: '39',
            waist: '34',
            hip: '40',
            thigh: '23',
            knee: '16',
            bottomOpening: '14.5',
            crotchRise: '10.5',
            notes: 'Cross pocket and one back pocket',
          },
          pantPattern: 'formal_pant',
          pantCustomPattern: '',
          updatedAt: new Date(),
        },
      },
      {
        name: 'Hitesh Shah',
        mobileNumber: '9825012345',
        address: '45, Mahavir Society, Paldi, Ahmedabad',
        notes: 'Likes Kurta collar and loose comfortable fitting',
        latestMeasurements: {
          unit: 'inch',
          shirt: {
            length: '30',
            chest: '42',
            waist: '38',
            shoulder: '19',
            sleeveLength: '24.5',
            sleeveOpening: '10',
            neck: '16',
            frontChest: '20',
            notes: 'Plain white buttons',
          },
          shirtPattern: 'plain',
          shirtCustomPattern: '',
          pant: {
            length: '40',
            waist: '36',
            hip: '42',
            thigh: '24',
            knee: '17',
            bottomOpening: '15',
            crotchRise: '11',
            notes: 'Pleated trousers',
          },
          pantPattern: 'pleated',
          pantCustomPattern: '',
          updatedAt: new Date(),
        },
      },
      {
        name: 'Vijay Panchal',
        mobileNumber: '9428098765',
        address: '8, Vishwakarma Nagar, Maninagar, Ahmedabad',
        notes: 'Jeans style cutting with double stitching',
        latestMeasurements: {
          unit: 'inch',
          shirt: {
            length: '27.5',
            chest: '38',
            waist: '32',
            shoulder: '17.5',
            sleeveLength: '23.5',
            sleeveOpening: '9',
            neck: '15',
            frontChest: '18.5',
            notes: '',
          },
          shirtPattern: 'striped',
          shirtCustomPattern: '',
          pant: {
            length: '38.5',
            waist: '32',
            hip: '38',
            thigh: '22',
            knee: '15.5',
            bottomOpening: '13.5',
            crotchRise: '10',
            notes: 'Jeans style with coin pocket',
          },
          pantPattern: 'jeans_style',
          pantCustomPattern: '',
          updatedAt: new Date(),
        },
      },
      {
        name: 'Bhavesh Soni',
        mobileNumber: '9909011223',
        address: '24, Soni Bazar, Raipur, Ahmedabad',
        notes: '',
        latestMeasurements: {
          unit: 'inch',
          shirt: {
            length: '29',
            chest: '41',
            waist: '37',
            shoulder: '18.5',
            sleeveLength: '24',
            sleeveOpening: '9.5',
            neck: '16',
            frontChest: '20',
            notes: '',
          },
          shirtPattern: 'printed',
          shirtCustomPattern: '',
          pant: {
            length: '39.5',
            waist: '35',
            hip: '41',
            thigh: '23.5',
            knee: '16.5',
            bottomOpening: '14',
            crotchRise: '10.5',
            notes: '',
          },
          pantPattern: 'pencil_fit',
          pantCustomPattern: '',
          updatedAt: new Date(),
        },
      },
    ];

    const insertedCustomers = await Customer.insertMany(customersData);
    console.log(`[Seed] Created ${insertedCustomers.length} customers.`);

    // 3. Create Sample Orders
    const year = new Date().getFullYear();
    const today = new Date();
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 86400000 * 3);
    const yesterday = new Date(Date.now() - 86400000);

    const ordersData = [
      {
        orderNumber: `ORD-${year}-00001`,
        customer: insertedCustomers[0]._id,
        customerSnapshot: {
          name: insertedCustomers[0].name,
          mobileNumber: insertedCustomers[0].mobileNumber,
          address: insertedCustomers[0].address,
        },
        orderDate: yesterday,
        deadline: today, // DUE TODAY!
        deliveryTime: 'Evening 6:00 PM',
        status: 'ready',
        measurementUnit: 'inch',
        shirt: {
          quantity: 2,
          pattern: 'checks',
          measurements: insertedCustomers[0].latestMeasurements.shirt,
        },
        pant: {
          quantity: 2,
          pattern: 'formal_pant',
          measurements: insertedCustomers[0].latestMeasurements.pant,
        },
        specialInstructions: 'For wedding ceremony, put monogram "RP" on cuff',
        pricing: {
          shirtPrice: 450,
          pantPrice: 550,
          total: 2000,
          advancePaid: 1000,
          balanceDue: 1000,
        },
      },
      {
        orderNumber: `ORD-${year}-00002`,
        customer: insertedCustomers[1]._id,
        customerSnapshot: {
          name: insertedCustomers[1].name,
          mobileNumber: insertedCustomers[1].mobileNumber,
          address: insertedCustomers[1].address,
        },
        orderDate: today,
        deadline: tomorrow, // DUE TOMORROW
        deliveryTime: 'Afternoon 12:00 PM',
        status: 'in_progress',
        measurementUnit: 'inch',
        shirt: {
          quantity: 1,
          pattern: 'plain',
          measurements: insertedCustomers[1].latestMeasurements.shirt,
        },
        pant: {
          quantity: 1,
          pattern: 'pleated',
          measurements: insertedCustomers[1].latestMeasurements.pant,
        },
        specialInstructions: 'Keep Kurta style collar',
        pricing: {
          shirtPrice: 400,
          pantPrice: 500,
          total: 900,
          advancePaid: 500,
          balanceDue: 400,
        },
      },
      {
        orderNumber: `ORD-${year}-00003`,
        customer: insertedCustomers[2]._id,
        customerSnapshot: {
          name: insertedCustomers[2].name,
          mobileNumber: insertedCustomers[2].mobileNumber,
          address: insertedCustomers[2].address,
        },
        orderDate: yesterday,
        deadline: dayAfter, // UPCOMING
        deliveryTime: 'Evening 5:00 PM',
        status: 'pending',
        measurementUnit: 'inch',
        shirt: {
          quantity: 1,
          pattern: 'striped',
          measurements: insertedCustomers[2].latestMeasurements.shirt,
        },
        pant: {
          quantity: 2,
          pattern: 'jeans_style',
          measurements: insertedCustomers[2].latestMeasurements.pant,
        },
        specialInstructions: 'Double stitching and orange thread',
        pricing: {
          shirtPrice: 450,
          pantPrice: 600,
          total: 1650,
          advancePaid: 1650,
          balanceDue: 0,
        },
      },
      {
        orderNumber: `ORD-${year}-00004`,
        customer: insertedCustomers[3]._id,
        customerSnapshot: {
          name: insertedCustomers[3].name,
          mobileNumber: insertedCustomers[3].mobileNumber,
          address: insertedCustomers[3].address,
        },
        orderDate: new Date(Date.now() - 86400000 * 5),
        deadline: new Date(Date.now() - 86400000 * 2),
        deliveryTime: 'Evening 7:00 PM',
        status: 'delivered', // COMPLETED
        measurementUnit: 'inch',
        shirt: {
          quantity: 1,
          pattern: 'printed',
          measurements: insertedCustomers[3].latestMeasurements.shirt,
        },
        pant: {
          quantity: 1,
          pattern: 'pencil_fit',
          measurements: insertedCustomers[3].latestMeasurements.pant,
        },
        specialInstructions: 'Delivered successfully, full payment received',
        pricing: {
          shirtPrice: 500,
          pantPrice: 550,
          total: 1050,
          advancePaid: 1050,
          balanceDue: 0,
        },
      },
    ];

    await Order.insertMany(ordersData);
    console.log(`[Seed] Created ${ordersData.length} sample orders in English.`);

    // Update OrderCounter so next order will be ORD-YYYY-00005
    await OrderCounter.findOneAndUpdate(
      { name: `order_seq_${year}` },
      { seq: 4 },
      { upsert: true }
    );
    console.log('[Seed] OrderCounter set to 4.');

    console.log('[Seed] Seeding completed successfully in English!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

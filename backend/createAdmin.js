// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const Admin = require('./models/Admin');

// dotenv.config();

// const createAdmin = async () => {
//     try {
//         // Connect to MongoDB (no extra options needed)
//         await mongoose.connect(process.env.MONGO_URI);
//         console.log('MongoDB connected');

//         const admin = new Admin({
//             name: 'Shalba Admin',
//             email: 'shalba@gmail.com',
//             password: 'shalu123', // will be hashed automatically
//             role: 'superadmin'
//         });

//         await admin.save();
//         console.log('Admin created successfully!');
//         process.exit(0); // success
//     } catch (err) {
//         console.error('Error creating admin:', err.message);
//         process.exit(1); // failure
//     }
// };

// createAdmin();

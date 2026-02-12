const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync('admin123', salt);

        const adminUsername = 'admin'; // Default admin username

        // Try to find existing admin to preserve username if possible, or just force create/update 'admin'
        // If we want to be safe, let's look for ANY admin.

        let admin = await User.findOne({ role: 'admin' });

        if (admin) {
            console.log(`Found existing admin: ${admin.username}`);
            admin.password = hashedPassword;
            await admin.save();
            console.log(`Password for '${admin.username}' has been reset to: admin123`);
        } else {
            console.log('No admin found. Creating new admin user.');
            admin = new User({
                username: adminUsername,
                password: hashedPassword,
                role: 'admin',
                nama: 'Administrator'
            });
            await admin.save();
            console.log(`Created new admin user '${adminUsername}' with password: admin123`);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetAdmin();

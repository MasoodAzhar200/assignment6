const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;
require('dotenv').config();

let userSchema = new Schema({
    userName: { type: String, unique: true },
    password: String,
    email: String,
    loginHistory: [{ dateTime: Date, userAgent: String }]
  });

  let User; // to be defined on new connection

module.exports.initialize = function() {
  return new Promise(function (resolve, reject) {
    let db = mongoose.createConnection(process.env.MONGODB_URI);
    db.on('error', (err) => {
      reject(err);
    });
    db.once('open', () => {
      User = db.model("users", userSchema);
      resolve();
    });
  });
};

module.exports.registerUser = function(userData) {
    return new Promise((resolve, reject) => {
        if (userData.password !== userData.password2) {
            reject("Passwords do not match");
        } else {
            // Hash the password first.
            bcrypt.hash(userData.password, 10).then((hashedPassword) => {
                let newUser = new User({
                    userName: userData.userName,
                    password: hashedPassword, // Save the hashed password
                    email: userData.email,
                    loginHistory: []
                });

                newUser.save().then(() => {
                    resolve();
                }).catch((err) => {
                    if (err.code === 11000) {
                        reject("User Name already taken");
                    } else {
                        reject("There was an error creating the user: " + err);
                    }
                });
            }).catch((err) => {
                reject("There was an error encrypting the password");
            });
        }
    });
};


module.exports.checkUser = function(userData) {
    return new Promise((resolve, reject) => {
        User.findOne({ userName: userData.userName }).then((user) => {
            if (!user) {
                reject(`Unable to find user: ${userData.userName}`);
            } else {
                // Use bcrypt to compare the provided password with the hashed password in the database.
                bcrypt.compare(userData.password, user.password).then((passwordsMatch) => {
                    if (passwordsMatch) {
                        // Update login history
                        user.loginHistory.push({ dateTime: new Date().toString(), userAgent: userData.userAgent });
                        User.updateOne({ userName: user.userName }, { $set: { loginHistory: user.loginHistory } })
                            .then(() => {
                                resolve(user);
                            })
                            .catch((err) => {
                                reject(`There was an error verifying the user: ${err}`);
                            });
                    } else {
                        reject(`Incorrect Password for user: ${userData.userName}`);
                    }
                }).catch((err) => {
                    reject(`Error comparing passwords: ${err}`);
                });
            }
        }).catch((err) => {
            reject(`Unable to find user: ${userData.userName} due to an error: ${err}`);
        });
    });
};
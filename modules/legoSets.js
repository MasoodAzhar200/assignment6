require('dotenv').config();
const setData = require("../data/setData");
const themeData = require("../data/themeData");

const Sequelize = require('sequelize');


let sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false, 
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false 
    }
  }
});

const Theme = sequelize.define('Theme', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: Sequelize.STRING
}, { timestamps: false });

const Set = sequelize.define('Set', {
  set_num: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: Sequelize.STRING,
  year: Sequelize.INTEGER,
  theme_id: {
    type: Sequelize.INTEGER,
  },
  num_parts: Sequelize.INTEGER,
  img_url: Sequelize.STRING
}, { timestamps: false });

Set.belongsTo(Theme, {foreignKey: 'theme_id'});


let sets = [];

const validatedSets = setData.filter(set => {
  
  const themeExists = themeData.some(theme => theme.id === set.theme_id);
  return themeExists; 
});

function initialize() {
  return sequelize.sync().then(() => {
    console.log('Database synced');
  }).catch((err) => {
    console.error('Error syncing database: ', err);
  });
}


function getAllSets() {
  return Set.findAll({
    include: [Theme]
  });
}



function getSetByNum(setNum) {
  return Set.findOne({
    where: { set_num: setNum },
    include: [Theme]
  });
}

function getSetsByTheme(theme) {
  return Set.findAll({
    include: [{
      model: Theme,
      where: { name: { [Sequelize.Op.iLike]: `%${theme}%` } }
    }]
  });
}

  const validSetData = setData.filter(set => set.set_num != null && set.set_num.trim() !== '');


  // Get all themes
function getAllThemes() {
  return Theme.findAll();
}

// Add a new set
function addSet(setData) {
  return Set.create(setData);
}

async function editSet(set_num, setData) {
  const set = await Set.findOne({ where: { set_num: set_num } });
  if (set) {
    return set.update(setData);
  } else {
    throw new Error('Set not found');
  }
}

function deleteSet(set_num) {
  return new Promise((resolve, reject) => {
    Set.destroy({
      where: { set_num: set_num }
    })
    .then(() => resolve())
    .catch(err => reject(err));
  });
}

module.exports = {
  initialize,
  getAllSets,
  getSetByNum,
  getSetsByTheme,
  getAllThemes,
  addSet,
  editSet,
  deleteSet
};

const legoSets = require("../modules/legoSets");




legoSets.initialize()
  .then(() => legoSets.getAllSets())
  .then(allSets => {
    console.log("All Sets:", allSets);
    return legoSets.getSetByNum("0011-2");
  })
  .then(setByNum => {
    console.log("Set by Num:", setByNum);
    return legoSets.getSetsByTheme("tech");
  })
  .then(setsByTheme => {
    console.log("Sets by Theme (tech):", setsByTheme);
  })
  .catch(error => {
    console.error("Error:", error);
  });

  



/* ==========================================================================
   GoodPrice Backend Server - Node.js / Express & Telegram Bot Integration
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const MINI_APP_URL = process.env.MINI_APP_URL || `http://localhost:${PORT}`;

// --- Database Paths ---
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Ensure products file exists with initial mock data if blank
if (!fs.existsSync(PRODUCTS_FILE)) {
  const initialProducts = [
    {
      "id": 1,
      "name": "Беспроводные наушники ClearSound Max",
      "category": "electronics",
      "categoryName": "Электроника",
      "price": 12900,
      "description": "Минималистичные накладные наушники с активным шумоподавлением, студийным качеством звука и временем работы до 40 часов.",
      "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
      "rating": 4.8,
      "popular": true,
      "specs": {
        "Цвет": "Космический серый",
        "Подключение": "Bluetooth 5.2",
        "Время работы": "До 40 ч"
      }
    },
    {
      "id": 2,
      "name": "Умные часы Chronos Lite",
      "category": "electronics",
      "categoryName": "Электроника",
      "price": 8500,
      "description": "Элегантные смарт-часы с AMOLED-экраном, мониторингом здоровья 24/7 и влагозащитой IP68. Идеальное дополнение к вашему стилю.",
      "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
      "rating": 4.6,
      "popular": false,
      "specs": {
        "Цвет": "Черный матовый",
        "Экран": "AMOLED 1.43\"",
        "Влагозащита": "IP68"
      }
    },
    {
      "id": 3,
      "name": "Кожаный рюкзак Nomad Slim",
      "category": "accessories",
      "categoryName": "Аксессуары",
      "price": 14200,
      "description": "Ультратонкий городской рюкзак из натуральной кожи. Отделение для ноутбука до 15.6\", скрытые карманы и водоотталкивающее покрытие.",
      "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600",
      "rating": 4.9,
      "popular": true,
      "specs": {
        "Материал": "Натуральная кожа",
        "Объем": "15 литров",
        "Цвет": "Шоколадный"
      }
    },
    {
      "id": 4,
      "name": "Аромадиффузор Aura Wave",
      "category": "home",
      "categoryName": "Дом",
      "price": 3800,
      "description": "Ультразвуковой диффузор с мягкой LED-подсветкой и функцией холодного тумана. Создает атмосферу уюта и спокойствия в вашем доме.",
      "image": "https://images.unsplash.com/photo-1602928321679-560bb453f190?auto=format&fit=crop&q=80&w=600",
      "rating": 4.7,
      "popular": true,
      "specs": {
        "Объем": "300 мл",
        "Материал": "Керамика / Дерево",
        "Режимы": "3 уровня тумана"
      }
    },
    {
      "id": 5,
      "name": "Портативная колонка Orbit Mini",
      "category": "electronics",
      "categoryName": "Электроника",
      "price": 5400,
      "description": "Компактная акустика с объемным звуком 360 градусов и защитой от воды IPX7. Возьмите любимую музыку куда угодно.",
      "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=600",
      "rating": 4.5,
      "popular": false,
      "specs": {
        "Мощность": "15 Вт",
        "Время работы": "До 12 ч",
        "Цвет": "Морской синий"
      }
    }
  ];
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(initialProducts, null, 2));
}

// --- Express Configuration ---
app.use(express.json());
app.use(express.static(__dirname));

// Helper to read database
function readProducts() {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading products file', err);
    return [];
  }
}

// Helper to write database
function writeProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing products file', err);
    return false;
  }
}

// --- Authentication Middleware ---
function authRequired(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).send('No Authorization Header');
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (token === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).send('Invalid Password');
  }
}

// --- Routes & Pages Serving ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- API Endpoints ---

// Get all products
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Admin Login validation
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect Password' });
  }
});

// Add new product
app.post('/api/products', authRequired, (req, res) => {
  const products = readProducts();
  const { name, category, categoryName, price, image, description, popular, specs } = req.body;
  
  if (!name || !category || !price || !image || !description) {
    return res.status(400).send('Required fields are missing');
  }
  
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const rating = parseFloat((4.4 + Math.random() * 0.6).toFixed(1)); // Generate high rating 4.4-5.0
  
  const newProduct = {
    id: newId,
    name,
    category,
    categoryName,
    price: parseFloat(price),
    description,
    image,
    rating,
    popular: !!popular,
    specs: specs || {}
  };
  
  products.push(newProduct);
  if (writeProducts(products)) {
    res.status(201).json(newProduct);
  } else {
    res.status(500).send('Database write error');
  }
});

// Delete product
app.delete('/api/products/:id', authRequired, (req, res) => {
  const id = parseInt(req.params.id);
  let products = readProducts();
  
  const initialLength = products.length;
  products = products.filter(p => p.id !== id);
  
  if (products.length === initialLength) {
    return res.status(404).send('Product not found');
  }
  
  if (writeProducts(products)) {
    res.sendStatus(204);
  } else {
    res.status(500).send('Database write error');
  }
});


// --- Telegram Bot Setup ---
const botToken = process.env.TELEGRAM_BOT_TOKEN;

if (botToken) {
  console.log('🤖 Инициализация Telegram бот-клиента...');
  const bot = new TelegramBot(botToken, { polling: true });

  // Handle /start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.first_name || 'друг';
    
    const welcomeText = `👋 Привет, *${username}*!\n\nДобро пожаловать в *GoodPrice* — маркетплейс современных и минималистичных товаров.\n\nНажми на кнопку ниже, чтобы открыть наш каталог прямо внутри Telegram!`;
    
    bot.sendMessage(chatId, welcomeText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🛍 Открыть магазин',
              web_app: { url: MINI_APP_URL }
            }
          ]
        ]
      }
    });
  });

  // Handle data sent from the Mini App checkout
  bot.on('web_app_data', (msg) => {
    const chatId = msg.chat.id;
    const dataPayload = msg.web_app_data.data;
    
    try {
      const parsedData = JSON.parse(dataPayload);
      
      if (parsedData.type === 'checkout') {
        const orderMsg = `🎉 *Заказ успешно оформлен!*\n\n${parsedData.message}\n\nС вами свяжется наш менеджер для уточнения деталей оплаты и доставки. Спасибо за покупку!`;
        
        bot.sendMessage(chatId, orderMsg, {
          parse_mode: 'Markdown'
        });
      }
    } catch (e) {
      console.error('Error parsing web_app_data:', e);
      bot.sendMessage(chatId, `🎉 *Заказ оформлен!*\n\nСпасибо за ваш заказ! Мы свяжемся с вами в ближайшее время.`, {
        parse_mode: 'Markdown'
      });
    }
  });

  console.log(`🤖 Бот успешно запущен в режиме Long Polling!`);
} else {
  console.log('⚠️ TELEGRAM_BOT_TOKEN не настроен в .env. Бот не запущен, но Mini App доступен локально.');
}


// --- Launch Express Server ---
app.listen(PORT, () => {
  console.log(`🚀 Сервер GoodPrice запущен успешно на порту ${PORT}!`);
  console.log(`👉 Локальный адрес каталога: http://localhost:${PORT}`);
  console.log(`👉 Локальный адрес админ-панели: http://localhost:${PORT}/admin (пароль по умолчанию: "${ADMIN_PASSWORD}")`);
});

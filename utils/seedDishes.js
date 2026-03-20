// utils/seedDishes.js – Seed Ethiopian dishes across all categories
require('dotenv').config();
const mongoose = require('mongoose');
const Dish = require('../models/Dish');

const dishes = [
    // === FOOD (Main Dishes) ===
    {
        name: 'Doro Wat',
        nameAm: 'ዶሮ ወጥ',
        description: 'Classic Ethiopian chicken stew simmered in berbere spice with boiled eggs, served with injera.',
        descriptionAm: 'በበርበሬ ቅመም የተዘጋጀ ዶሮ ወጥ ከእንቁላል ጋር',
        price: 350,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
        spiceLevel: 'hot'
    },
    {
        name: 'Kitfo',
        nameAm: 'ክትፎ',
        description: 'Premium minced raw beef seasoned with mitmita spice and kibbeh (spiced butter). Ethiopian delicacy.',
        descriptionAm: 'በሚጥሚጣ እና ቅቤ የተዘጋጀ ጥሬ ሥጋ',
        price: 380,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee?w=400',
        spiceLevel: 'hot'
    },
    {
        name: 'Tibs',
        nameAm: 'ጥብስ',
        description: 'Sautéed beef or lamb with onions, tomatoes, jalapeños and rosemary. A beloved Ethiopian classic.',
        descriptionAm: 'ከሽንኩርት እና ቲማቲም ጋር የተጠበሰ ሥጋ',
        price: 320,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Shiro Wat',
        nameAm: 'ሽሮ ወጥ',
        description: 'Smooth chickpea flour stew spiced with berbere, garlic, and onions. A popular fasting dish.',
        descriptionAm: 'በበርበሬ እና ነጭ ሽንኩርት የተዘጋጀ ሽሮ',
        price: 180,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Gomen',
        nameAm: 'ጎመን',
        description: 'Ethiopian-style collard greens sautéed with garlic, ginger, and onions. Healthy and flavorful.',
        descriptionAm: 'ከነጭ ሽንኩርት እና ዝንጅብል ጋር የተዘጋጀ ጎመን',
        price: 150,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        spiceLevel: 'mild'
    },
    {
        name: 'Misir Wat',
        nameAm: 'ምስር ወጥ',
        description: 'Spicy red lentil stew cooked with berbere spice blend. Rich, hearty and perfect for fasting days.',
        descriptionAm: 'በበርበሬ የተዘጋጀ ምስር ወጥ',
        price: 160,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400',
        spiceLevel: 'hot'
    },
    {
        name: 'Zilzil Tibs',
        nameAm: 'ዝልዝል ጥብስ',
        description: 'Strips of tender beef sautéed with onions, green peppers, and rosemary.',
        descriptionAm: 'ረዣዥም ቁራጭ ሥጋ ከነጭ ሽንኩርት እና ቃሪያ ጋር',
        price: 340,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1529694157872-4e0c0f3b238b?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Beyaynetu',
        nameAm: 'በያይነቱ',
        description: 'Colorful platter of assorted vegetarian dishes served on injera. Perfect for sharing.',
        descriptionAm: 'የተለያዩ የፆም ምግቦች በዕንጀራ ላይ',
        price: 280,
        category: 'food',
        imageUrl: 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee?w=400',
        spiceLevel: 'mild'
    },

    // === APPETIZERS ===
    {
        name: 'Sambusa',
        nameAm: 'ሳምቡሳ',
        description: 'Crispy triangular pastries filled with spiced lentils or seasoned minced meat.',
        descriptionAm: 'በሊጥ የተሸፈነ ሥጋ ወይም ምስር',
        price: 80,
        category: 'appetizer',
        imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400',
        spiceLevel: 'mild'
    },
    {
        name: 'Kategna',
        nameAm: 'ካተኛ',
        description: 'Crispy injera rolls brushed with kibbeh (spiced butter) and berbere. Perfect snack.',
        descriptionAm: 'በቅቤ እና በርበሬ የተዘጋጀ ቀጫጫ ዕንጀራ',
        price: 60,
        category: 'appetizer',
        imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Azifa',
        nameAm: 'አዚፋ',
        description: 'Cold green lentil salad with onions, jalapeños, and lemon juice. Refreshing appetizer.',
        descriptionAm: 'ቀዝቃዛ ምስር ሰላጣ ከሽንኩርት እና ሌሞን ጋር',
        price: 90,
        category: 'appetizer',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        spiceLevel: 'mild'
    },

    // === BREAKFAST ===
    {
        name: 'Chechebsa (Kita Firfir)',
        nameAm: 'ጨጨብሳ',
        description: 'Shredded flatbread tossed in spiced butter and berbere. Traditional Ethiopian breakfast.',
        descriptionAm: 'በቅቤ እና በርበሬ የተዘጋጀ ቂጣ',
        price: 120,
        category: 'breakfast',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Firfir',
        nameAm: 'ፍርፍር',
        description: 'Shredded injera mixed with spicy berbere sauce. Can be made with meat or vegetarian.',
        descriptionAm: 'በወጥ የተደባለቀ ዕንጀራ',
        price: 130,
        category: 'breakfast',
        imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
        spiceLevel: 'hot'
    },
    {
        name: 'Enkulal Firfir',
        nameAm: 'እንቁላል ፍርፍር',
        description: 'Scrambled eggs with tomatoes, onions, and green peppers mixed with injera pieces.',
        descriptionAm: 'ከሽንኩርት እና ቲማቲም ጋር የተዘጋጀ እንቁላል',
        price: 110,
        category: 'breakfast',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
        spiceLevel: 'mild'
    },
    {
        name: 'Fatira',
        nameAm: 'ፋቲራ',
        description: 'Flaky layered flatbread served with honey and spiced butter. Sweet morning treat.',
        descriptionAm: 'በማር እና ቅቤ የሚቀርብ ፋቲራ',
        price: 100,
        category: 'breakfast',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
        spiceLevel: 'mild'
    },

    // === DESSERTS ===
    {
        name: 'Dabo Kolo',
        nameAm: 'ዳቦ ቆሎ',
        description: 'Crunchy bite-sized bread snacks seasoned with spices. Popular Ethiopian treat.',
        descriptionAm: 'በቅመም የተዘጋጀ ጥብጥብ ዳቦ',
        price: 50,
        category: 'dessert',
        imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400',
        spiceLevel: 'mild'
    },
    {
        name: 'Himbasha',
        nameAm: 'ህምባሻ',
        description: 'Celebratory Ethiopian bread lightly sweetened with honey and cardamom.',
        descriptionAm: 'በማር እና ቅመም የተዘጋጀ ልዩ ዳቦ',
        price: 70,
        category: 'dessert',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
        spiceLevel: ''
    },

    // === COFFEE ===
    {
        name: 'Buna (Ethiopian Coffee)',
        nameAm: 'ቡና',
        description: 'Traditional Ethiopian coffee ceremony. Freshly roasted, ground, and brewed to perfection.',
        descriptionAm: 'ባህላዊ የኢትዮጵያ ቡና',
        price: 80,
        category: 'coffee',
        imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
        spiceLevel: ''
    },
    {
        name: 'Macchiato',
        nameAm: 'ማኪያቶ',
        description: 'Ethiopian-style macchiato with rich espresso and a touch of steamed milk.',
        descriptionAm: 'ኢትዮጵያዊ ማኪያቶ',
        price: 60,
        category: 'coffee',
        imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400',
        spiceLevel: ''
    },
    {
        name: 'Spris (Spiced Coffee)',
        nameAm: 'ስፕሪስ',
        description: 'Half tea, half coffee – a unique Ethiopian blend served hot.',
        descriptionAm: 'ግማሽ ሻይ ግማሽ ቡና',
        price: 50,
        category: 'coffee',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
        spiceLevel: ''
    },

    // === DRINKS ===
    {
        name: 'Fresh Avocado Juice',
        nameAm: 'አቮካዶ ጁስ',
        description: 'Creamy avocado juice blended with lime and a touch of honey. Refreshing and nutritious.',
        descriptionAm: 'ትኩስ አቮካዶ ጁስ',
        price: 70,
        category: 'drink',
        imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400',
        spiceLevel: ''
    },
    {
        name: 'Mango Smoothie',
        nameAm: 'ማንጎ ስሙዝ',
        description: 'Tropical mango smoothie made with fresh Ethiopian mangoes and honey.',
        descriptionAm: 'ትኩስ ማንጎ ስሙዝ',
        price: 80,
        category: 'drink',
        imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400',
        spiceLevel: ''
    },
    {
        name: 'Tej (Honey Wine)',
        nameAm: 'ጠጅ',
        description: 'Traditional Ethiopian honey wine brewed with gesho leaves. Sweet and aromatic.',
        descriptionAm: 'ባህላዊ የኢትዮጵያ ጠጅ',
        price: 120,
        category: 'drink',
        imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400',
        spiceLevel: ''
    },
    {
        name: 'Tella (Ethiopian Beer)',
        nameAm: 'ጠላ',
        description: 'Traditional homebrew beer with a unique smoky flavor from gesho herb.',
        descriptionAm: 'ባህላዊ ጠላ',
        price: 60,
        category: 'drink',
        imageUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400',
        spiceLevel: ''
    },

    // === COMBOS ===
    {
        name: 'Family Feast Combo',
        nameAm: 'የቤተሰብ ኮምቦ',
        description: 'Doro Wat + Tibs + Shiro + Gomen + Misir Wat on a giant injera. Feeds 4-5 people.',
        descriptionAm: 'ለ4-5 ሰው የሚበቃ የተለያዩ ምግቦች',
        price: 850,
        category: 'combo',
        imageUrl: 'https://images.unsplash.com/photo-1567982047351-76b6f93e38ee?w=400',
        spiceLevel: 'medium'
    },
    {
        name: 'Couple\'s Delight',
        nameAm: 'የጥንዶች ኮምቦ',
        description: 'Kitfo + Tibs served with salad and 2 drinks of your choice. Perfect for two.',
        descriptionAm: 'ክትፎ + ጥብስ + ሰላጣ + 2 መጠጦች',
        price: 550,
        category: 'combo',
        imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
        spiceLevel: 'hot'
    },
    {
        name: 'Breakfast Special Combo',
        nameAm: 'የቁርስ ኮምቦ',
        description: 'Chechebsa + Enkulal Firfir + Buna (coffee). The perfect Ethiopian morning.',
        descriptionAm: 'ጨጨብሳ + እንቁላል ፍርፍር + ቡና',
        price: 250,
        category: 'combo',
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
        spiceLevel: 'medium'
    }
];

async function seedDishes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Don't delete existing dishes, only add new ones
        for (const dish of dishes) {
            const exists = await Dish.findOne({ name: dish.name });
            if (!exists) {
                await Dish.create(dish);
                console.log(`  ✅ Added: ${dish.name} (${dish.category})`);
            } else {
                console.log(`  ⏭️  Skipped (exists): ${dish.name}`);
            }
        }

        console.log('\n🎉 Seed complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed error:', err);
        process.exit(1);
    }
}

seedDishes();

(function () {
  const tables = [
    { id: "T1", offer: "Fried Chicken Combo starts at Rs. 149." },
    { id: "T2", offer: "3 mocktails for the price of 2 (selected drinks)." },
    { id: "T3", offer: "Free brownie on orders above Rs. 1200." },
    { id: "T4", offer: "Flat Rs. 100 off on family combo orders." },
    { id: "T5", offer: "Evening tea combo at special pricing." },
    { id: "T6", offer: "Free mint mojito on selected combo orders." }
  ];

  const menu = [
    { id: "FC01", name: "2 Piece Chicken Combo", price: 149, type: "Fried Chicken Combo", prep: 14 },
    { id: "FC02", name: "3 Piece Chicken Combo", price: 249, type: "Fried Chicken Combo", prep: 16 },
    { id: "FC03", name: "4 Piece Chicken Combo", price: 319, type: "Fried Chicken Combo", prep: 18 },
    { id: "FC04", name: "5 Piece Chicken Combo", price: 359, type: "Fried Chicken Combo", prep: 18 },
    { id: "FC05", name: "6 Piece Chicken Combo", price: 449, type: "Fried Chicken Combo", prep: 20 },
    { id: "FC06", name: "8 Piece Chicken Combo", price: 539, type: "Fried Chicken Combo", prep: 22 },
    { id: "FC07", name: "10 Piece Chicken Combo", price: 639, type: "Fried Chicken Combo", prep: 24 },
    { id: "FC08", name: "12 Piece Chicken Combo", price: 759, type: "Fried Chicken Combo", prep: 25 },
    { id: "FC09", name: "15 Piece Chicken Combo", price: 969, type: "Fried Chicken Combo", prep: 28 },
    { id: "FC10", name: "20 Piece Chicken Combo", price: 1300, type: "Fried Chicken Combo", prep: 30 },

    { id: "FF01", name: "Chicken Burger", price: 100, type: "Fast Food", prep: 8 },
    { id: "FF02", name: "Chicken Wrap", price: 100, type: "Fast Food", prep: 8 },

    { id: "CP01", name: "Leg Piece", price: 75, type: "Choice Piece", prep: 6 },
    { id: "CP02", name: "Breast Piece", price: 80, type: "Choice Piece", prep: 7 },

    { id: "HD01", name: "Tea", price: 10, type: "Hot Drinks", prep: 4 },
    { id: "HD02", name: "Coffee", price: 15, type: "Hot Drinks", prep: 4 },
    { id: "HD03", name: "Boost", price: 15, type: "Hot Drinks", prep: 4 },
    { id: "HD04", name: "Horlicks", price: 15, type: "Hot Drinks", prep: 4 },
    { id: "HD05", name: "Black Coffee", price: 10, type: "Hot Drinks", prep: 4 },
    { id: "HD06", name: "Black Tea", price: 10, type: "Hot Drinks", prep: 4 },
    { id: "HD07", name: "Lemon Tea", price: 15, type: "Hot Drinks", prep: 4 },
    { id: "HD08", name: "Mint Tea", price: 15, type: "Hot Drinks", prep: 4 },

    { id: "FJ01", name: "Apple Juice", price: 80, type: "Fresh Juice", prep: 5 },
    { id: "FJ02", name: "Orange Juice", price: 60, type: "Fresh Juice", prep: 5 },
    { id: "FJ03", name: "Watermelon Juice", price: 30, type: "Fresh Juice", prep: 4 },
    { id: "FJ04", name: "Pineapple Juice", price: 60, type: "Fresh Juice", prep: 5 },
    { id: "FJ05", name: "Mango Juice", price: 70, type: "Fresh Juice", prep: 5 },
    { id: "FJ06", name: "Lime Juice", price: 20, type: "Fresh Juice", prep: 4 },
    { id: "FJ07", name: "Grapes Juice", price: 60, type: "Fresh Juice", prep: 5 },
    { id: "FJ08", name: "Pomegranate Juice", price: 80, type: "Fresh Juice", prep: 6 },
    { id: "FJ09", name: "Shamam Juice", price: 70, type: "Fresh Juice", prep: 5 },

    { id: "KU01", name: "Lime Kulukki", price: 25, type: "Kulukki", prep: 4 },
    { id: "KU02", name: "Pachamanga Kulukki", price: 30, type: "Kulukki", prep: 4 },
    { id: "KU03", name: "Orange Kulukki", price: 35, type: "Kulukki", prep: 4 },
    { id: "KU04", name: "Pineapple Kulukki", price: 35, type: "Kulukki", prep: 4 },
    { id: "KU05", name: "Boost Kulukki", price: 35, type: "Kulukki", prep: 4 },
    { id: "KU06", name: "Horlicks Kulukki", price: 35, type: "Kulukki", prep: 4 },

    { id: "MS01", name: "Karikku Milk Shake", price: 60, type: "Milk Shakes", prep: 6 },
    { id: "MS02", name: "Mango Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },
    { id: "MS03", name: "Avocado Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },
    { id: "MS04", name: "Sharja Milk Shake", price: 50, type: "Milk Shakes", prep: 6 },
    { id: "MS05", name: "Saudi Milk Shake", price: 60, type: "Milk Shakes", prep: 6 },
    { id: "MS06", name: "Badam Milk Shake", price: 90, type: "Milk Shakes", prep: 7 },
    { id: "MS07", name: "Cashew Milk Shake", price: 90, type: "Milk Shakes", prep: 7 },
    { id: "MS08", name: "Kitkat Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },
    { id: "MS09", name: "Snickers Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },
    { id: "MS10", name: "Apple Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },
    { id: "MS11", name: "Oreo Milk Shake", price: 70, type: "Milk Shakes", prep: 6 },

    { id: "MJ01", name: "Green Apple Mojito", price: 70, type: "Mojitos", prep: 5 },
    { id: "MJ02", name: "Passion Fruit Mojito", price: 70, type: "Mojitos", prep: 5 },
    { id: "MJ03", name: "Mint Mojito", price: 70, type: "Mojitos", prep: 5 },
    { id: "MJ04", name: "Blue Lagoon Mojito", price: 80, type: "Mojitos", prep: 5 },

    { id: "NS01", name: "Parippu Vada", price: 10, type: "Nadan Snacks", prep: 5 },
    { id: "NS02", name: "Uzhunnu Vada", price: 10, type: "Nadan Snacks", prep: 5 },
    { id: "NS03", name: "Pazham Pori", price: 10, type: "Nadan Snacks", prep: 5 },
    { id: "NS04", name: "Mutta Baji", price: 10, type: "Nadan Snacks", prep: 5 },
    { id: "NS05", name: "Masala Baji", price: 10, type: "Nadan Snacks", prep: 5 },

    { id: "ML01", name: "Chatti Pathiri", price: 25, type: "Malabar Snacks", prep: 8 },
    { id: "ML02", name: "Erachi Pathiri", price: 25, type: "Malabar Snacks", prep: 8 },
    { id: "ML03", name: "Bread Pocket", price: 20, type: "Malabar Snacks", prep: 7 },
    { id: "ML04", name: "Chicken Samosa", price: 15, type: "Malabar Snacks", prep: 7 },
    { id: "ML05", name: "Kilikoodu", price: 25, type: "Malabar Snacks", prep: 8 },
    { id: "ML06", name: "Kapola", price: 20, type: "Malabar Snacks", prep: 7 },
    { id: "ML07", name: "Sharkkara Petti", price: 25, type: "Malabar Snacks", prep: 8 },
    { id: "ML08", name: "Chicken Roll", price: 20, type: "Malabar Snacks", prep: 8 },
    { id: "ML09", name: "Chicken Cutlet", price: 20, type: "Malabar Snacks", prep: 8 },

    { id: "TN01", name: "Porotta", price: 10, type: "Thani Nadan", prep: 5 },
    { id: "TN02", name: "Nool Porotta", price: 20, type: "Thani Nadan", prep: 6 },
    { id: "TN03", name: "Chicken Fry Half", price: 100, type: "Thani Nadan", prep: 14 },
    { id: "TN04", name: "Chicken Fry Full", price: 200, type: "Thani Nadan", prep: 18 },
    { id: "TN05", name: "Beef Fry", price: 130, type: "Thani Nadan", prep: 14 },
    { id: "TN06", name: "Chicken Curry", price: 120, type: "Thani Nadan", prep: 12 },
    { id: "TN07", name: "Chicken Stew", price: 150, type: "Thani Nadan", prep: 14 },
    { id: "TN08", name: "Beef Roast", price: 130, type: "Thani Nadan", prep: 14 },
    { id: "TN09", name: "Beef Masala", price: 130, type: "Thani Nadan", prep: 14 },

    { id: "SP01", name: "Pidiyum Kozhiyum", price: 130, type: "Nadan Special", prep: 15 },
    { id: "SP02", name: "Bread and Stew", price: 130, type: "Nadan Special", prep: 12 },
    { id: "SP03", name: "Pazhampori Beef", price: 100, type: "Nadan Special", prep: 12 },
    { id: "SP04", name: "Paalkappa Beef", price: 130, type: "Nadan Special", prep: 14 }
  ];

  const offers = [
    {
      id: "OFR01",
      title: "Best Value Meal",
      badge: "Most Chosen",
      windowLabel: "All Day",
      dealPrice: 199,
      cta: "Add Deal",
      priority: 1,
      items: [
        { id: "FC01", qty: 1 },
        { id: "MJ03", qty: 1 }
      ]
    },
    {
      id: "OFR02",
      title: "Snack Booster",
      badge: "Popular Add-on",
      windowLabel: "Till 11:00 PM",
      dealPrice: 159,
      cta: "Add Deal",
      priority: 2,
      items: [
        { id: "FF01", qty: 1 },
        { id: "CP01", qty: 1 }
      ]
    },
    {
      id: "OFR03",
      title: "Party Pair Combo",
      badge: "Limited Time",
      windowLabel: "4:00 PM - 11:00 PM",
      startsAt: "16:00",
      endsAt: "23:00",
      dealPrice: 309,
      cta: "Add Deal",
      priority: 3,
      items: [
        { id: "FC02", qty: 1 },
        { id: "MJ04", qty: 1 }
      ]
    },
    {
      id: "OFR04",
      title: "Tea Time Pair",
      badge: "Quick Bite",
      windowLabel: "4:00 PM - 7:00 PM",
      startsAt: "16:00",
      endsAt: "19:00",
      dealPrice: 50,
      cta: "Add Deal",
      priority: 4,
      items: [
        { id: "HD01", qty: 2 },
        { id: "ML09", qty: 2 }
      ]
    }
  ];

  window.APP_DATA = {
    brand: {
      name: "ALDEEK Container Cafe",
      area: "Bypass Road, Anchal",
      phone: "8891141064, 9747961384"
    },
    tables,
    menu,
    offers
  };
})();

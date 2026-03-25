const Order = require("../models/orderModel");

exports.getDashboardStats = async (req, res) => {
  try {
    const filter = req.query.filter || "week";
    const { fromDate, toDate } = req.query;

    let query = {};

    // ✅ CUSTOM DATE FILTER
    if (filter === "custom" && fromDate && toDate) {

  console.log("RAW:", fromDate, toDate);

  // 🔥 FIX: handle dd-mm-yyyy format
  function parseDate(dateStr) {
    const [day, month, year] = dateStr.split("-");
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  const start = parseDate(fromDate);
  const end = parseDate(toDate);
  end.setUTCHours(23, 59, 59, 999);

  query.createdAt = {
    $gte: start,
    $lte: end
  };

  console.log("FROM:", start);
  console.log("TO:", end);
} else {

      // DEFAULT FILTERS
      let startDate = new Date();

      if (filter === "today") {
        startDate.setHours(0, 0, 0, 0);
      }

      if (filter === "week") {
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      }

      if (filter === "month") {
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
      }

      query.createdAt = { $gte: startDate };

      // Optional debug
      console.log("FILTER:", filter);
      console.log("START DATE:", startDate);
    }

    // ✅ USE QUERY HERE
    const ordersForChart = await Order.find(query)
  .select("createdAt totalAmount");

console.log("RESULT COUNT:", ordersForChart.length);

    res.json({
      totalUsers: await User.countDocuments(),
      totalOrders: await Order.countDocuments(),
      totalProducts: await Product.countDocuments(),
      totalRevenue: await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]).then(r => r[0]?.total || 0),

      ordersForChart
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
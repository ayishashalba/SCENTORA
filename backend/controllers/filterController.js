const Product=require("../models/Product");

exports.filterProducts = async (req, res) => {
    try {

        let query = {};

        // CATEGORY / NOTE FILTER
        if (req.query.category) {

           let categories = req.query.category;

if (categories) {
    if (!Array.isArray(categories)) {
        categories = categories.split(",");
    }

    query.category = { $in: categories };
}

            query.category = {
    $in: categories.map(c => new RegExp(`^${c}$`, "i"))
};
        }

        // TARGET / GENDER FILTER
if (req.query.target) {
    const targets = Array.isArray(req.query.target)
        ? req.query.target
        : [req.query.target];

    // Map "Attars" to "attar"
    const normalizedTargets = targets.map(t => t.toLowerCase() === "attars" ? "attar" : t);
    query.gender = { $in: normalizedTargets.map(t => new RegExp(`^${t}$`, "i")) };
}
        // SIZE FILTER
        if (req.query.size) {

    const sizes = Array.isArray(req.query.size)
        ? req.query.size
        : [req.query.size];
query.size = { $in: sizes };
}
// AVAILABILITY FILTER
if (req.query.availability === "outofstock") {
    query.stock = 0;
}
if (req.query.availability === "instock") {
    query.stock = { $gt: 0 };
}
        // PRICE FILTER
        if (req.query.minPrice || req.query.maxPrice) {

            query.price = {};

            if (req.query.minPrice)
                query.price.$gte = Number(req.query.minPrice);

            if (req.query.maxPrice)
                query.price.$lte = Number(req.query.maxPrice);
        }

        // SEARCH
        if (req.query.search) {

            query.name = {
                $regex: req.query.search,
                $options: "i"
            };
        }

        const products = await Product.find(query);

        res.json(products);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
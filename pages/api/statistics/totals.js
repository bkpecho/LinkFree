import fs from "fs";
import path from "path";

import connectMongo from "@config/mongo";
import logger from "@config/logger";

import { Profile, Stats } from "@models/index"


export default async function handler(req, res) {
  if (req.method != "GET") {
    return res
      .status(400)
      .json({ error: "Invalid request: GET request required" });
  }

  const { statusCode, stats } = await getTotalStats();
  return res.status(statusCode).json(stats);
}

export async function getTotalStats() {
  await connectMongo();

  let totalStats = [];
  try {
    totalStats = await Stats.aggregate([{
      $group: {
        _id: null,
        totalViews:  { $sum: "$views" },
        totalClicks: { $sum: "$clicks" },
      }
    }]);
  } catch (e) {
    logger.error(e, "failed to load stats");
  }

  let activeProfiles = 0;
  try {
    activeProfiles = await Profile.find({}).estimatedDocumentCount();
  } catch (e) {
    logger.error(e, "failed to load profile statistics");
  }

  const directoryPath = path.join(process.cwd(), "data");
  let totalProfiles = [];
  try {
    totalProfiles = fs
      .readdirSync(directoryPath)
      .filter((item) => item.includes("json"));
  } catch (e) {
    logger.error(e, "failed to load profile list");
  }

  return {
    statusCode: 200,
    stats: {
      views: totalStats[0]?.totalViews || 0,
      clicks: totalStats[0]?.totalClicks || 0,
      users: totalProfiles.length || 0,
      active: activeProfiles || 0,
    },
  };
}

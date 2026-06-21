const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.use(express.json());

const { exec } = require("child_process");

app.post("/metadata", (req, res) => {

    console.log("METADATA ROUTE HIT");

    const url = req.body.url;

    console.log("URL RECEIVED:", url);

    console.log("STARTING YT-DLP");

     
        exec(
    `python -m yt_dlp --no-playlist -J "${url}"`,
        (error, stdout, stderr) => {

            console.log("YT-DLP FINISHED");

            if (error) {
                console.log(error);
                return res.status(500).json({
                    error: error.message
                });
            }

            console.log("JSON PARSE START");

            const videoData = JSON.parse(stdout);

            console.log("JSON PARSE DONE");

const formats = videoData.formats
.filter(f => f.ext === "mp4" || f.ext === "m4a")
.map(f => ({
    id: f.format_id,
    ext: f.ext,
    resolution: f.resolution,
    hasVideo: f.vcodec !== "none",
    hasAudio: f.acodec !== "none"
}));

console.table(formats);

res.json({
    title: videoData.title,
    channel: videoData.channel,
    thumbnail: videoData.thumbnail,
    duration: videoData.duration,
    views: videoData.view_count,
    uploadDate: videoData.upload_date,
    formats: formats
});
        }
    )
});

app.post("/download", (req, res) => {

    const url = req.body.url;
    const formatId = req.body.formatId;

    console.log("URL:", url);
    console.log("Format:", formatId);

    exec(
        `python -m yt_dlp -f ${formatId} -o "downloads/%(title)s.%(ext)s" "${url}"`,
        (error, stdout, stderr) => {

            console.log("STDOUT:");
            console.log(stdout);

            console.log("STDERR:");
            console.log(stderr);

            if (error) {

                console.log("ERROR:");
                console.log(error);

                return res.status(500).json({
                    success: false,
                    message: "Download failed"
                });

            }

            res.json({
                success: true,
                message: "Download completed"
            });

        }
    );

});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
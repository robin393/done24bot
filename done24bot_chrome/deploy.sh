
rm ../done24bot_chrome_deploy/*
java -jar ./yuicompressor-2.4.8.jar --type js common.js > ../done24bot_chrome_deploy/common.min.js
java -jar ./yuicompressor-2.4.8.jar --type js background.js > ../done24bot_chrome_deploy/background.min.js
java -jar ./yuicompressor-2.4.8.jar --type js popup.js > ../done24bot_chrome_deploy/popup.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-support.js > ../done24bot_chrome_deploy/content-support.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-telegram.js > ../done24bot_chrome_deploy/content-telegram.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-facebook.js > ../done24bot_chrome_deploy/content-facebook.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-instagram.js > ../done24bot_chrome_deploy/content-instagram.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-reddit.js > ../done24bot_chrome_deploy/content-reddit.min.js
java -jar ./yuicompressor-2.4.8.jar --type js content-google.js > ../done24bot_chrome_deploy/content-google.min.js
cp ./popup.html ../done24bot_chrome_deploy/
cp ./manifest.json ../done24bot_chrome_deploy/
cp ./*min.js ../done24bot_chrome_deploy/
cp ./manifest.json ../done24bot_chrome_deploy/
cp ./*.css ../done24bot_chrome_deploy/
cp ./*.png ../done24bot_chrome_deploy/
sed -i -e 's/common.js/common.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/background.js/background.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/popup.js/popup.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-support.js/content-support.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-telegram.js/content-telegram.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-facebook.js/content-facebook.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-instagram.js/content-instagram.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-reddit.js/content-reddit.min.js/g' ../done24bot_chrome_deploy/manifest.json
sed -i -e 's/content-google.js/content-google.min.js/g' ../done24bot_chrome_deploy/manifest.json

sed -i -e 's/common.js/common.min.js/g' ../done24bot_chrome_deploy/popup.html
sed -i -e 's/popup.js/popup.min.js/g' ../done24bot_chrome_deploy/popup.html


cd ../done24bot_chrome_deploy
rm ~/done_chrome_deploy.zip 
zip -r ~/done24bot_chrome_deploy.zip *
cd ../../done24bot_chrome

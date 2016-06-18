import csv
import os.path

from flask import Flask, Response, request


app = Flask(__name__)
DEST_FILE = "data.csv"
FIELDS = ['finish_time', 'milliseconds', 'words', 'characters', 'errors', 'wpm']

@app.route("/")
def welcome():
    return "Hello World from Typist home"

@app.route("/data", methods=['POST', 'GET'])
def data():
    # Post new data
    if request.method == 'POST':
        # Create row
        row = {}
        for field in FIELDS:
            if (field == 'wpm'):
                row[field] =  str(int(float(request.form['words']) * 60 * 1000 / float(request.form['milliseconds'])))
            else:
                row[field] = request.form[field]

        # Write to CSV
        file_exist = os.path.isfile(DEST_FILE)
        with open(DEST_FILE, 'ab') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=FIELDS)
            if (not file_exist):
                writer.writeheader()
            writer.writerow(row)
            return 'success'

    # Get data
    else:
        # Create file if it doesn't exist
        file_exist = os.path.isfile(DEST_FILE)
        if (not file_exist):
            with open(DEST_FILE, 'wb') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=FIELDS)
                writer.writeheader()

        # Read the file and return
        with open(DEST_FILE, 'r') as csvfile:
            content = csvfile.read()
        return content


if __name__ == "__main__":
    app.run()

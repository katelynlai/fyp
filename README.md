# Final Year Project Management System

This project is a web application designed for managing students, staff, supervisors, and moderators within a final year project management context. The application provides an intuitive user interface for module admin staff to efficiently handle various administrative tasks.

## Features

- **Admin Dashboard**: A centralized interface for managing all entities (students, staff, supervisors, moderators).
- **Bulk Data Import**: Functionality to import student and staff data from spreadsheets in bulk.
- **Data Management**: View, edit, and manage student and staff information.
- **Allocation Management**: Allocate supervisors and moderators based on specified criteria.

## Export Data

The application provides the following export functionalities:

1. **Export Student-Moderator Spreadsheet**: Exports a CSV file containing student IDs and moderator names.
2. **Export Detailed Allocation Spreadsheet**: Exports a CSV file containing student IDs, student names, supervisor names, supervisor emails, moderator names, and moderator emails.
3. **Export Student-Supervisor Spreadsheet**: Exports a CSV file containing student IDs, student names, supervisor names, and supervisor emails.

## Project Structure

```
final-year-project-management
├── public
│   ├── index.html                  # Main HTML document
│   └── favicon.ico                 # Favicon for the application
├── src
│   ├── components
│   │   ├── AdminDashboard.js       # Admin dashboard component
│   │   ├── BulkImport.js           # Bulk import component
│   │   ├── EditData.js             # Edit data component
│   │   ├── ViewData.js             # View data component
│   ├── pages
│   │   ├── HomePage.js             # Landing page component
│   │   ├── StudentsPage.js         # Students management page
│   │   ├── StaffPage.js            # Staff management page
│   │   └── Allocation.js           # Allocation component
├── package.json                    # npm configuration file
├── App.js                          # Main application component
├── App.css                         # CSS styles for the application
├── index.js                        # Entry point for the React application
├── api.js                          # API calls or functions to interact with back-end
├── firebase.js                     # Firebase configuration and services
├── index.css                       # Global CSS styles
├── firebaserc                      # Firebase project configuration
├── .gitignore                      # Files to ignore in version control
├── firebase.json                   # Firebase hosting and function settings
├── package-lock.json               # Ensures consistent dependency versions
└── README.md                       # Project documentation
```

## Getting Started

1. **Clone the repository**:
   ```
   git clone https://github.com/katelynlai/fyp.git
   ```

2. **Navigate to the project directory**:
   ```
   cd final-year-project-management
   ```

3. **Install dependencies**:
   ```
   npm install
   ```

4. **Run the application**:
   ```
   npm start
   ```

The application will be available at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License.

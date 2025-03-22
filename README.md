# Final Year Project Management System

This project is a web application designed for managing students, staff, supervisors, and moderators within a final year project management context. The application provides an intuitive user interface for module admin staff to efficiently handle various administrative tasks.

## Features

- **Admin Dashboard**: A centralized interface for managing all entities (students, staff, supervisors, moderators).
- **Bulk Data Import**: Functionality to import student and staff data from spreadsheets in bulk.
- **Data Management**: View, edit, and manage student and staff information.
- **Allocation Management**: Allocate supervisors and moderators based on specified criteria.

## Project Structure

```
final-year-project-management
├── public
│   ├── index.html         # Main HTML document
│   └── favicon.ico        # Favicon for the application
├── src
│   ├── components
│   │   ├── AdminDashboard.js  # Admin dashboard component
│   │   ├── BulkImport.js      # Bulk import component
│   │   ├── EditData.js        # Edit data component
│   │   ├── ViewData.js        # View data component
│   │   └── Allocation.js       # Allocation component
│   ├── pages
│   │   ├── HomePage.js        # Landing page component
│   │   ├── StudentsPage.js     # Students management page
│   │   ├── StaffPage.js        # Staff management page
│   │   ├── SupervisorsPage.js  # Supervisors management page
│   │   └── ModeratorsPage.js   # Moderators management page
│   ├── App.js                 # Main application component
│   ├── App.css                # CSS styles for the application
│   ├── index.js               # Entry point for the React application
│   └── logo.svg               # Logo image for the application
├── package.json               # npm configuration file
├── .gitignore                 # Files to ignore in version control
└── README.md                  # Project documentation
```

## Getting Started

1. **Clone the repository**:
   ```
   git clone <https://github.com/katelynlai/fyp.git>
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

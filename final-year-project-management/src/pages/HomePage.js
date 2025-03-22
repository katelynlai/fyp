const HomePage = () => {
  return (
    <div className="home-page">
      <h1>Welcome to the FYP Management Web App</h1>
      <p>
        This web application allows module admin staff to manage students, staff, supervisors, and moderators for the Final Year Project. You can also allocate supervisors and moderators to students and import data in bulk using CSV files.
      </p>
      <style>{`
        .home-page {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
const transporter = require("../config/emailConfig");

exports.sendContactEmail = async (req, res) => {
  try {
    const { fullName, email, persons, date, message } = req.body;

    // Send email to admin/CS
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "New Contact Form Message",
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Persons:</strong> ${persons}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

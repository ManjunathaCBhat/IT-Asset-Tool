import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const { Title } = Typography;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // States for both forms
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState(false);

  // Form to REQUEST reset link (enter email)
  const onRequestReset = async (values) => {
    setLoading(true);
    setResetSuccess(false);
    setResetError(false);
    try {
      await axios.post('http://localhost:5000/api/forgot-password', { email: values.email });
      message.success('Reset link sent! Please check your email.');
      setResetSuccess(true);
    } catch (error) {
      message.error('Failed to send reset link. Try again later.');
      setResetError(true);
    } finally {
      setLoading(false);
    }
  };

  // Form to SET new password (with token and email)
  const onSetNewPassword = async (values) => {
    setLoading(true);
    setResetSuccess(false);
    setResetError(false);
    try {
      await axios.post('http://localhost:5000/api/reset-password', {
  email,
  token,
  newPassword: values.password,
});

      message.success('Password reset successfully! You can now log in.');
      setResetSuccess(true);
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to reset password.');
      setResetError(true);
    } finally {
      setLoading(false);
    }
  };

  // Show form depending on whether token and email are present
  if (token && email) {
    // Show new password form
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ width: 400, padding: 24, boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: 8 }}>
          <Title level={3} style={{ textAlign: 'center' }}>Set New Password</Title>
          <Form layout="vertical" onFinish={onSetNewPassword}>
            <Form.Item
              label="New Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your new password!' }]}
              hasFeedback
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              label="Confirm Password"
              name="confirm"
              dependencies={['password']}
              hasFeedback
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Reset Password
              </Button>
            </Form.Item>
            {resetSuccess && (
              <div style={{ color: '#52c41a', textAlign: 'center', marginTop: 8 }}>
                Password reset successfully! You can now log in.
              </div>
            )}
            {resetError && (
              <div style={{ color: '#c41a1aff', textAlign: 'center', marginTop: 8 }}>
                Failed to reset password. Please try again.
              </div>
            )}
          </Form>
        </div>
      </div>
    );
  }

  // Show email input form to request reset link
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: 400, padding: 24, boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: 8 }}>
        <Title level={3} style={{ textAlign: 'center' }}>Reset Password</Title>
        <Form layout="vertical" onFinish={onRequestReset}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Send Reset Link
            </Button>
          </Form.Item>
          {resetSuccess && (
            <div style={{ color: '#52c41a', textAlign: 'center', marginTop: 8 }}>
              Reset link sent! Please check your email.
            </div>
          )}
          {resetError && (
            <div style={{ color: '#c41a1aff', textAlign: 'center', marginTop: 8 }}>
              Reset link failed! Please try again.
            </div>
          )}
        </Form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
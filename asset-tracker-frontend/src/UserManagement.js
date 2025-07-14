// src/UserManagement.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Typography, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/users');
            setUsers(res.data);
        } catch (err) {
            message.error('Failed to fetch users.');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const showAddUserModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleAddUser = async (values) => {
        try {
            await axios.post('http://localhost:5000/api/users/create', values);
            message.success('User created successfully!');
            setIsModalVisible(false);
            fetchUsers();
        } catch (err) {
            message.error(err.response?.data?.msg || 'Failed to create user.');
        }
    };
    
    const handleDeleteUser = async (userId) => {
        try {
            await axios.delete(`http://localhost:5000/api/users/${userId}`);
            message.success('User deleted successfully');
            fetchUsers();
        } catch (err) {
            message.error('Failed to delete user.');
        }
    };

    const columns = [
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Role', dataIndex: 'role', key: 'role' },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm title="Are you sure to delete this user?" onConfirm={() => handleDeleteUser(record._id)}>
                    <Button type="link" danger icon={<DeleteOutlined />}>Delete</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>User Management</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={showAddUserModal}>
                    Add User
                </Button>
            </div>
            <Table columns={columns} dataSource={users} rowKey="_id" />

            <Modal title="Add New User" open={isModalVisible} onCancel={handleCancel} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleAddUser}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                        <Select placeholder="Select a role">
                            <Option value="Admin">Admin</Option>
                            <Option value="Editor">Editor</Option>
                            <Option value="Viewer">Viewer</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button onClick={handleCancel}>Cancel</Button>
                            <Button type="primary" htmlType="submit">Create User</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UserManagement;

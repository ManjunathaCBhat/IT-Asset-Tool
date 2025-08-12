import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Typography, Popconfirm, Space, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const roles = [
    { value: 'Admin', label: 'Admin' },
    { value: 'Editor', label: 'Editor' },
    { value: 'Viewer', label: 'Viewer' },
];

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

const UserManagement = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [formEdit] = Form.useForm();
    const [editModal, setEditModal] = useState({ visible: false, user: null });
    const [deleteLoading, setDeleteLoading] = useState(null);
    const [editLoading, setEditLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);

    // Fetch users from backend
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/users', { 
                headers: getAuthHeader() 
            });
            setUsers(res.data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            message.error('Failed to fetch users: ' + (err.response?.data?.msg || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Add User Modal
    const showAddUserModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleAddUser = async (values) => {
        setAddLoading(true);
        try {
            const response = await axios.post(
                'http://localhost:5000/api/users/create',
                {
                    email: values.email,
                    password: values.password,
                    role: values.role,
                },
                { headers: getAuthHeader() }
            );
            
            message.success('User created successfully!');
            setIsModalVisible(false);
            form.resetFields();
            await fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error creating user:', err);
            const errorMsg = err.response?.data?.msg || err.response?.data?.message || 'Failed to create user';
            message.error(errorMsg);
        } finally {
            setAddLoading(false);
        }
    };

    // Delete User with proper loading state
    const handleDeleteUser = async (userId, userEmail) => {
        // Prevent self-deletion
        if (user && user.email === userEmail) {
            message.warning('You cannot delete your own account');
            return;
        }

        setDeleteLoading(userId);
        try {
            await axios.delete(`http://localhost:5000/api/users/${userId}`, { 
                headers: getAuthHeader() 
            });
            message.success('User deleted successfully');
            await fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error deleting user:', err);
            const errorMsg = err.response?.data?.msg || err.response?.data?.message || 'Failed to delete user';
            message.error(errorMsg);
        } finally {
            setDeleteLoading(null);
        }
    };

    // Edit User Modal (role only)
    const showEditModal = (userRecord) => {
        setEditModal({ visible: true, user: userRecord });
        // Use setTimeout to ensure modal is rendered before setting values
        setTimeout(() => {
            formEdit.setFieldsValue({
                email: userRecord.email,
                role: userRecord.role,
            });
        }, 100);
    };

    const handleEditRole = async () => {
        setEditLoading(true);
        try {
            const values = await formEdit.validateFields();
            
            await axios.put(
                `http://localhost:5000/api/users/${editModal.user._id}`,
                { role: values.role },
                { headers: getAuthHeader() }
            );
            
            message.success('User role updated successfully!');
            setEditModal({ visible: false, user: null });
            formEdit.resetFields();
            await fetchUsers(); // Refresh the list
        } catch (err) {
            console.error('Error updating user role:', err);
            const errorMsg = err.response?.data?.msg || err.response?.data?.message || 'Failed to update user role';
            message.error(errorMsg);
        } finally {
            setEditLoading(false);
        }
    };

    const handleEditCancel = () => {
        setEditModal({ visible: false, user: null });
        formEdit.resetFields();
    };

    const columns = [
        { 
            title: 'Email', 
            dataIndex: 'email', 
            key: 'email',
            sorter: (a, b) => a.email.localeCompare(b.email),
        },
        { 
            title: 'Role', 
            dataIndex: 'role', 
            key: 'role',
            filters: roles.map(role => ({ text: role.label, value: role.value })),
            onFilter: (value, record) => record.role === value,
        },
        {
            title: 'Actions',
            key: 'action',
            align: 'center',
            width: 150,
            render: (_, record) => {
                const isCurrentUser = user && user.email === record.email;
                
                return (
                    <Space>
                        <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => showEditModal(record)}
                            size="small"
                        >
                            Edit
                        </Button>
                        <Popconfirm
                            title={`Are you sure you want to delete user "${record.email}"?`}
                            description={isCurrentUser ? "Warning: You are about to delete your own account!" : undefined}
                            onConfirm={() => handleDeleteUser(record._id, record.email)}
                            okText="Yes"
                            cancelText="No"
                            okType="danger"
                            disabled={deleteLoading === record._id}
                        >
                            <Button 
                                type="link" 
                                danger 
                                icon={<DeleteOutlined />}
                                loading={deleteLoading === record._id}
                                size="small"
                                disabled={deleteLoading !== null}
                            >
                                Delete
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <Card>
            <div style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 16, 
                flexWrap: 'wrap', 
                gap: 8
            }}>
                <Title level={4} style={{ margin: 0 }}>User Management</Title>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={showAddUserModal}
                    disabled={loading}
                >
                    Add User
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="_id"
                loading={loading}
                pagination={{ 
                    pageSize: 10, 
                    showSizeChanger: true, 
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`
                }}
                style={{ width: '100%', minWidth: 300 }}
                scroll={{ x: 600 }}
            />

            {/* Add User Modal */}
            <Modal
                title="Add New User"
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
                maskClosable={false}
            >
                <Form 
                    form={form} 
                    layout="vertical" 
                    onFinish={handleAddUser}
                    disabled={addLoading}
                >
                    <Form.Item 
                        name="email" 
                        label="Email" 
                        rules={[
                            { required: true, message: 'Please input the email!' },
                            { type: 'email', message: 'Please enter a valid email!' }
                        ]}
                    >
                        <Input placeholder="Enter user email" />
                    </Form.Item>
                    <Form.Item 
                        name="password" 
                        label="Password" 
                        rules={[
                            { required: true, message: 'Please input the password!' },
                            { min: 6, message: 'Password must be at least 6 characters!' }
                        ]}
                    >
                        <Input.Password placeholder="Enter password" />
                    </Form.Item>
                    <Form.Item 
                        name="role" 
                        label="Role" 
                        rules={[{ required: true, message: 'Please select a role!' }]}
                    >
                        <Select placeholder="Select a role">
                            {roles.map(r => (
                                <Option value={r.value} key={r.value}>
                                    {r.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleCancel} disabled={addLoading}>
                                Cancel
                            </Button>
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                loading={addLoading}
                            >
                                Create User
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Edit Role Modal */}
            <Modal
                title="Edit User Role"
                open={editModal.visible}
                onCancel={handleEditCancel}
                onOk={handleEditRole}
                okText="Save Changes"
                cancelText="Cancel"
                destroyOnClose
                maskClosable={false}
                confirmLoading={editLoading}
                okButtonProps={{ disabled: editLoading }}
                cancelButtonProps={{ disabled: editLoading }}
            >
                {editModal.user && (
                    <Form
                        form={formEdit}
                        layout="vertical"
                        disabled={editLoading}
                    >
                        <Form.Item label="Email" name="email">
                            <Input disabled style={{ backgroundColor: '#f5f5f5' }} />
                        </Form.Item>
                        <Form.Item 
                            label="Role" 
                            name="role" 
                            rules={[{ required: true, message: 'Please select a role!' }]}
                        >
                            <Select placeholder="Select a role">
                                {roles.map(r => (
                                    <Option value={r.value} key={r.value}>
                                        {r.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </Card>
    );
};

export default UserManagement;

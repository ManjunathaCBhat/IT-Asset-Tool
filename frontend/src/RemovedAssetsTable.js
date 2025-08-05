import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Typography, Popconfirm, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;
const { Option } = Select;

const roles = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Editor', label: 'Editor' },
  { value: 'Viewer', label: 'Viewer' }
];

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [formEdit] = Form.useForm();
  const [editModal, setEditModal] = useState({ visible: false, user: null });
  const [tableLoading, setTableLoading] = useState(false);

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/users', { headers: getAuthHeader() });
      setUsers(res.data);
    } catch (err) {
      message.error('Failed to fetch users.');
    }
    setTableLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Add Modal logic
  const showAddUserModal = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleAddUser = async (values) => {
    try {
      await axios.post(
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
      fetchUsers();
    } catch (err) {
      message.error(err.response?.data?.msg || 'Failed to create user.');
    }
  };

  // Robust Delete
  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`, { headers: getAuthHeader() });
      message.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      if (err.response?.status === 404) {
        message.error('User not found.');
      } else if (err.response?.data?.msg) {
        message.error(err.response.data.msg);
      } else {
        message.error('Failed to delete user.');
      }
    }
  };

  // Edit User Modal (role only)
  const showEditModal = (user) => {
    setEditModal({ visible: true, user });
    setTimeout(() => {
      formEdit.setFieldsValue({
        email: user.email,
        role: user.role,
      });
    }, 0);
  };

  const handleEditRole = async () => {
    try {
      const values = await formEdit.validateFields();
      await axios.put(
        `http://localhost:5000/api/users/${editModal.user._id}`,
        { role: values.role },
        { headers: getAuthHeader() }
      );
      message.success('Role updated successfully!');
      setEditModal({ visible: false, user: null });
      fetchUsers();
      formEdit.resetFields();
    } catch (err) {
      message.error(err.response?.data?.msg || 'Failed to update role.');
    }
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    {
      title: 'Action',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this user?"
            okText="Yes"
            cancelText="No"
            okType="primary"
            // Popconfirm footer is always yes/cancel, no layout control but matches AntD standards.
            onConfirm={() => handleDeleteUser(record._id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8
      }}>
        <Title level={4} style={{ margin: 0 }}>User Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={showAddUserModal}>
          Add User
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="_id"
        loading={tableLoading}
        pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
        style={{ width: '100%', minWidth: 300 }}
      />

      {/* Add User Modal */}
      <Modal
        title="Add New User"
        open={isModalVisible}
        onCancel={handleCancel}
        destroyOnHidden
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" form="addUserForm">Create User</Button>
          </div>
        }
      >
        <Form
          id="addUserForm"
          form={form}
          layout="vertical"
          onFinish={handleAddUser}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select placeholder="Select a role">
              {roles.map(r => <Option value={r.value} key={r.value}>{r.label}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        title="Edit User Role"
        open={editModal.visible}
        onCancel={() => {
          setEditModal({ visible: false, user: null });
          formEdit.resetFields();
        }}
        onOk={handleEditRole}
        okText="Save"
        cancelText="Cancel"
        destroyOnHidden
      >
        {editModal.user && (
          <Form
            form={formEdit}
            layout="vertical"
            initialValues={{
              email: editModal.user.email,
              role: editModal.user.role
            }}
          >
            <Form.Item label="Email" name="email">
              <Input disabled />
            </Form.Item>
            <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Please select a role' }]}>
              <Select placeholder="Select a role">
                {roles.map(r => <Option value={r.value} key={r.value}>{r.label}</Option>)}
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default UserManagement;

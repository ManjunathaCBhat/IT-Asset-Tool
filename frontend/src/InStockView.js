import React, { useState } from 'react';
import axios from 'axios';
import {Button,Modal,Form,Input,Row,Col,message,Space,Dropdown,Popconfirm,Tag,Typography,} from 'antd';
import {MoreOutlined,EditOutlined,EyeOutlined,} from '@ant-design/icons';
import moment from 'moment';
import PageShell from './PageShell';

const { Text } = Typography;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'x-auth-token': token } : {};
};

const renderWarrantyTag = (date) => {
  if (!date) return <Text disabled>N/A</Text>;
  const warrantyDate = moment(date, 'YYYY-MM-DD');
  if (!warrantyDate.isValid()) return <Text disabled>Invalid Date</Text>;
  const today = moment();
  const thirtyDaysFromNow = moment().add(30, 'days');
  if (warrantyDate.isBefore(today)) {
    return (
      <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>
    );
  }
  if (warrantyDate.isBefore(thirtyDaysFromNow)) {
    return (
      <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>
    );
  }
  return warrantyDate.format('DD MMM YYYY');
};

const InStockView = ({ user }) => {
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form] = Form.useForm();
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [detailsEquipment, setDetailsEquipment] = useState(null);
  const [confirmationConfig, setConfirmationConfig] = useState(null); // For Popconfirm control

  const inStockColumns = [
    { title: 'Model', dataIndex: 'model', key: 'model' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Serial Number', dataIndex: 'serialNumber', key: 'serialNumber' },
    {
      title: 'Warranty Expiry',
      dataIndex: 'warrantyInfo',
      key: 'warrantyInfo',
      render: renderWarrantyTag,
    },
  ];

  const handleAssignClick = (record) => {
    setSelectedEquipment(record);
    form.resetFields();
    setIsAssignModalVisible(true);
    setConfirmationConfig(null);
  };

  const handleAssignSubmit = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = { ...values, status: 'In Use' };
      await axios.put(
        `http://localhost:5000/api/equipment/${selectedEquipment._id}`,
        updatedData,
        { headers: getAuthHeader() }
      );
      message.success('Asset assigned successfully!');
      setIsAssignModalVisible(false);
    } catch (error) {
      message.error('Assignment failed. Please check the details.');
    }
  };

  const handleViewDetails = (record) => {
    setDetailsEquipment(record);
    setIsDetailsModalVisible(true);
  };

  // Instead of embedding Popconfirm in menu, we confirm separately before changing status
  const confirmStatusChange = (record, newStatus, fetchDataCallback) => {
    setConfirmationConfig({
      visible: true,
      title: `Move this item to ${newStatus}?`,
      onConfirm: async () => {
        try {
          await axios.put(
            `http://localhost:5000/api/equipment/${record._id}`,
            { status: newStatus },
            { headers: getAuthHeader() }
          );
          message.success(`Moved to ${newStatus}`);
          setConfirmationConfig(null);
          if (fetchDataCallback) fetchDataCallback();
        } catch (err) {
          message.error(`Failed to update status to ${newStatus}`);
        }
      },
      onCancel: () => setConfirmationConfig(null),
    });
  };

  const renderInStockActions = (record, fetchDataCallback) => {
  const menuItems = [
    {
      key: 'damage',
      label: 'Move to Damaged',
      danger: true,
      onClick: () => confirmStatusChange(record, 'Damaged', fetchDataCallback),
    },
    {
      key: 'ewaste',
      label: 'Move to E-Waste',
      danger: true,
      onClick: () => confirmStatusChange(record, 'E-Waste', fetchDataCallback),
    },
  ];

  return (
    <Space>
      <Button
        type="text"
        icon={<EyeOutlined style={{ fontSize: '20px' }} />}
        onClick={() => handleViewDetails(record)}
        title="View Details"
      />

      <Button
        type="text"
        icon={<EditOutlined style={{ fontSize: '20px' }} />}
        onClick={() => handleAssignClick(record)}
        title="Assign"
      />

      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Button type="text" icon={<MoreOutlined style={{ fontSize: '20px' }} />} />
      </Dropdown>

      {confirmationConfig?.visible && (
        <Popconfirm
          open={true}
          title={confirmationConfig.title}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={confirmationConfig.onCancel}
          okText="Yes"
          cancelText="No"
        >
          <span />
        </Popconfirm>
      )}
    </Space>
  );
};

  return (
    <>
      <PageShell
        pageTitle="In-Stock Equipment"
        apiEndpoint="http://localhost:5000/api/equipment"
        tableColumns={inStockColumns}
        user={user}
        initialFilters={{ status: 'In Stock' }} // Pre-filter the data
        hideFilters={['status']} // Hide the status filter since it's redundant
        renderCustomActions={renderInStockActions} // Provide the custom actions
      />

      {/* Assign Modal */}
      <Modal
        title={`Assign: ${selectedEquipment?.model || ''}`}
        open={isAssignModalVisible}
        onOk={handleAssignSubmit}
        onCancel={() => setIsAssignModalVisible(false)}
        okText="Assign"
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assigneeName"
                label="Assignee Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position"
                label="Position"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="employeeEmail"
                label="Employee Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal
        title={`Equipment Details: ${detailsEquipment?.model || ''}`}
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={null}
      >
        {detailsEquipment && (
          <div>
            <p><b>Asset ID:</b> {detailsEquipment.assetId || 'N/A'}</p>
      <p><b>Model:</b> {detailsEquipment.model || 'N/A'}</p>
      <p><b>Category:</b> {detailsEquipment.category || 'N/A'}</p>
      <p><b>Status:</b> {detailsEquipment.status || 'N/A'}</p>
      <p><b>Serial Number:</b> {detailsEquipment.serialNumber || 'N/A'}</p>
      <p><b>Warranty Expiry:</b> {renderWarrantyTag(detailsEquipment.warrantyInfo)}</p>
      <p><b>Location:</b> {detailsEquipment.location || 'N/A'}</p>
      <p><b>Comment:</b> {detailsEquipment.comment || 'N/A'}</p>
    </div>
        )}
      </Modal>
    </>
  );
};

export default InStockView;

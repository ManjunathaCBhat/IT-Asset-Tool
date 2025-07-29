import React, { useState } from 'react';
import axios from 'axios';
import {
  Button,
  Modal,
  Form,
  Input,
  Row,
  Col,
  message,
  Space,
  Dropdown,
  Popconfirm,
  Tag,
  Typography,
} from 'antd';
import {
  WarningOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
} from '@ant-design/icons';
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
    return <Tag color="error">Expired: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  if (warrantyDate.isBefore(thirtyDaysFromNow)) {
    return <Tag color="warning">Expires: {warrantyDate.format('DD MMM YYYY')}</Tag>;
  }
  return warrantyDate.format('DD MMM YYYY');
};

const InStockView = ({ user }) => {
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [form] = Form.useForm();
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [detailsEquipment, setDetailsEquipment] = useState(null);

  // State controlling external Popconfirm for status changes
  const [confirmationConfig, setConfirmationConfig] = useState(null);

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

  // Show confirmation Popconfirm for changing status
  const confirmStatusChange = (record, newStatus, fetchDataCallback) => {
    setConfirmationConfig({
      visible: true,
      title: `Move asset "${record.model} (${record.serialNumber})" to ${newStatus}?`,
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
          setConfirmationConfig(null);
        }
      },
      onCancel: () => setConfirmationConfig(null),
    });
  };

  // Render row action buttons including dropdown with menu items
const renderInStockActions = (record, fetchDataCallback) => {
  const handleMoveStatus = async (record, newStatus) => {
    try {
      await axios.put(
        `http://localhost:5000/api/equipment/${record._id}`,
        { status: newStatus },
        { headers: getAuthHeader() }
      );
      message.success(`Moved to ${newStatus}`);
      if (fetchDataCallback) fetchDataCallback();
    } catch (error) {
      message.error(`Failed to update status to ${newStatus}`);
    }
  };

  const menuItems = [
    {
      key: 'damage',
      label: (
        <Popconfirm
          title={`Move asset "${record.model} (${record.serialNumber})" to Damaged?`}
          onConfirm={() => handleMoveStatus(record, 'Damaged')}
          okText="Yes"
          cancelText="No"
          placement="top"
          popupAlign={{ offset: [10, -40] }}   // Same upward shift here
        >
          <span style={{ color: 'red' }}>
            <WarningOutlined /> Move to Damaged
          </span>
        </Popconfirm>
      ),
    },
    {
      key: 'ewaste',
      label: (
        <Popconfirm
          title={`Move asset "${record.model} (${record.serialNumber})" to E-Waste?`}
          onConfirm={() => handleMoveStatus(record, 'E-Waste')}
          okText="Yes"
          cancelText="No"
          placement="top"
          popupAlign={{ offset: [10, -70] }}   // Same upward shift here
        >
          <span style={{ color: '#8B572A' }}>
            <DeleteOutlined /> Move to E-Waste
          </span>
        </Popconfirm>
      ),
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
        initialFilters={{ status: 'In Stock' } }
        hideFilters={['status']}
        renderCustomActions={renderInStockActions}
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
              <Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Position" rules={[{ required: true }]}>
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
              <Form.Item name="phoneNumber" label="Phone Number" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="department" label="Department" rules={[{ required: true }]}>
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
            <p>
              <b>Asset ID:</b> {detailsEquipment.assetId || 'N/A'}
            </p>
            <p>
              <b>Model:</b> {detailsEquipment.model || 'N/A'}
            </p>
            <p>
              <b>Category:</b> {detailsEquipment.category || 'N/A'}
            </p>
            <p>
              <b>Status:</b> {detailsEquipment.status || 'N/A'}
            </p>
            <p>
              <b>Serial Number:</b> {detailsEquipment.serialNumber || 'N/A'}
            </p>
            <p>
              <b>Warranty Expiry:</b> {renderWarrantyTag(detailsEquipment.warrantyInfo)}
            </p>
            <p>
              <b>Location:</b> {detailsEquipment.location || 'N/A'}
            </p>
            <p>
              <b>Comment:</b> {detailsEquipment.comment || 'N/A'}
            </p>
          </div>
        )}
      </Modal>

      {/* External Popconfirm for status change */}
      {confirmationConfig && (
        <Popconfirm
          title={confirmationConfig.title}
          open={confirmationConfig.visible}
          onConfirm={confirmationConfig.onConfirm}
          onCancel={confirmationConfig.onCancel}
          okText="Yes"
          cancelText="No"
          placement="top"
          // It's necessary to render Popconfirm with a child:
        >
          <span style={{ display: 'none' }} />
        </Popconfirm>
      )}
    </>
  );
};

export default InStockView;

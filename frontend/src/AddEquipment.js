import React, { useState } from 'react';
import axios from 'axios';
import { Form, Input, Button, Select, message, Row, Col, Card, Typography, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;
const { Title } = Typography;

// This helper function can be moved to a shared utils file
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

const AddEquipment = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [status, setStatus] = useState('In Stock');
    const [category, setCategory] = useState('');

    // This function generates the unique ID for the asset
    const generateAssetId = async (cat = '') => {
        const prefix = cat ? cat.substring(0, 3).toUpperCase() : 'OTH';
        try {
            const response = await axios.get(`http://localhost:5000/api/equipment/count/${cat}`, {
                headers: getAuthHeader()
            });
            const count = response.data.count || 0;
            const newIdNumber = (count + 1).toString().padStart(3, '0');
            return `${prefix}-${newIdNumber}`;
        } catch (err) {
            console.error("Error generating assetId", err);
            // Provide a fallback ID in case of an error
            return `${prefix}-ERR-${Date.now()}`;
        }
    };

    const onFinish = async (values) => {
        try {
            // Determine the final category
            const categoryToUse = values.category === 'Other' ? values.customCategory : values.category;

            // --- FIX: Generate the assetId here, right before submission ---
            const assetId = await generateAssetId(categoryToUse);

            const finalValues = {
                ...values,
                assetId: assetId,
                category: categoryToUse,
                warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
                purchasePrice: values.purchasePrice ? parseFloat(values.purchasePrice) : 0, // Ensure purchasePrice is a number
            };

            // Remove the temporary customCategory field if it exists
            delete finalValues.customCategory;

            await axios.post('http://localhost:5000/api/equipment', finalValues, { headers: getAuthHeader() });
            message.success('Equipment added successfully!');
            navigate('/all-assets'); // <--- CHANGED THIS LINE TO REDIRECT TO /all-assets
        } catch (error) {
            console.error("Error adding equipment:", error);
            message.error(error.response?.data?.message || 'Failed to add equipment.');
        }
    };

    // We only need to track the values that change the form's structure
    const handleValuesChange = (changedValues) => {
        if (changedValues.status) {
            setStatus(changedValues.status);
        }
        if (changedValues.category) {
            setCategory(changedValues.category);
        }
    };

    // Render conditional fields based on the selected status
    const renderDynamicFields = () => {
        if (status === 'In Use') {
            return (
                <Card title="Assignee Details" bordered={false} style={{ marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col xs={24} sm={12}><Form.Item name="assigneeName" label="Assignee Name" rules={[{ required: true }]}><Input placeholder="John Doe" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="position" label="Position"><Input placeholder="Software Engineer" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="employeeEmail" label="Employee Email" rules={[{ type: 'email' }]}><Input placeholder="john.doe@example.com" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="phoneNumber" label="Phone Number"><Input placeholder="Enter phone number" /></Form.Item></Col>
                        <Col xs={24} sm={12}><Form.Item name="department" label="Department"><Input placeholder="Technology" /></Form.Item></Col>
                    </Row>
                </Card>
            );
        }
        if (status === 'Damaged') {
            return (
                <Card title="Damage Information" bordered={false} style={{ marginBottom: 24 }}>
                    <Form.Item name="damageDescription" label="Damage Description" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} placeholder="Describe the damage in detail..." />
                    </Form.Item>
                </Card>
            );
        }
        return null;
    };

    return (
        <div style={{ background: '#f0f2f5', padding: '24px' }}>
            <Card style={{ maxWidth: 800, margin: 'auto' }}>
                <Title level={3} style={{ textAlign: 'center', marginBottom: '24px' }}>Add New Equipment</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    onValuesChange={handleValuesChange}
                    initialValues={{ status: 'In Stock' }}
                >
                    <Card title="Core Information" bordered={false} style={{ marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}>
                                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                                    <Select placeholder="Select a category">
                                        <Option value="Laptop">Laptop</Option>
                                        <Option value="Headset">Headset</Option>
                                        <Option value="Keyboard">Keyboard</Option>
                                        <Option value="Mouse">Mouse</Option>
                                        <Option value="Monitor">Monitor</Option>
                                        <Option value="Other">Other</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            {category === 'Other' && (
                                <Col xs={24} sm={12}>
                                    <Form.Item name="customCategory" label="Custom Category Name" rules={[{ required: true }]}>
                                        <Input placeholder="e.g., Docking Station" />
                                    </Form.Item>
                                </Col>
                            )}
                            <Col xs={24} sm={12}>
                                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                    <Select>
                                        <Option value="In Stock">In Stock</Option>
                                        <Option value="In Use">In Use</Option>
                                        <Option value="Damaged">Damaged</Option>
                                        <Option value="E-Waste">E-Waste</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12}> {/* Added purchasePrice input field */}
                                <Form.Item
                                    name="purchasePrice"
                                    label="Purchase Price (INR)"
                                    rules={[{
                                        type: 'number',
                                        transform: (value) => parseFloat(value),
                                        message: 'Please enter a valid number',
                                    }]}
                                >
                                    <Input type="number" step="0.01" placeholder="e.g., 25000.00" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {renderDynamicFields()}

                    <Card title="Hardware & Warranty Details" bordered={false} style={{ marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12}><Form.Item name="model" label="Model / Brand"><Input placeholder="e.g., Dell Latitude 5420" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="serialNumber" label="Serial Number"><Input placeholder="Enter serial number" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="location" label="Location"><Input placeholder="e.g., Hyderabad Office" /></Form.Item></Col>
                            <Col xs={24} sm={12}><Form.Item name="warrantyInfo" label="Warranty Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        </Row>
                    </Card>

                    <Form.Item name="comment" label="Additional Comments">
                        <Input.TextArea rows={3} placeholder="Any other relevant details..." />
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'center' }}>
                        <Button type="primary" htmlType="submit" size="large" style={{ width: '50%' }}>
                            Add Equipment
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AddEquipment;
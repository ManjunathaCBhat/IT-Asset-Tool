import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Input, Button, Select, message, Row, Col, Card, Typography, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';

const { Option } = Select;
const { Title } = Typography;

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'x-auth-token': token } : {};
};

const AddEquipment = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [category, setCategory] = useState('');

    const generateAssetId = async (cat = '') => {
        const prefix = cat ? cat.substring(0, 3).toUpperCase() : 'OTH';
        try {
            const response = await axios.get(`http://localhost:5000/api/equipment/count/${encodeURIComponent(cat)}`, {
                headers: getAuthHeader()
            });
            const count = response.data.count || 0;
            const newIdNumber = (count + 1).toString().padStart(3, '0');
            return `${prefix}-${newIdNumber}-${Date.now().toString().slice(-5)}`;
        } catch (err) {
            console.error("Error generating assetId", err);
            return `${prefix}-ERR-${Date.now()}`;
        }
    };

    const onFinish = async (values) => {
        try {
            const categoryToUse = values.category === 'Other' ? values.customCategory : values.category;
            const assetId = await generateAssetId(categoryToUse);

            const finalValues = {
                ...values,
                assetId: assetId,
                category: categoryToUse,
                status: 'In Stock',
                warrantyInfo: values.warrantyInfo ? values.warrantyInfo.format('YYYY-MM-DD') : null,
                purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
                purchasePrice: values.purchasePrice ? parseFloat(values.purchasePrice) : 0,
            };

            delete finalValues.customCategory;

            delete finalValues.assigneeName;
            delete finalValues.position;
            delete finalValues.employeeEmail;
            delete finalValues.phoneNumber;
            delete finalValues.department;
            delete finalValues.damageDescription;

            console.log("Final payload for adding equipment:", finalValues);

            await axios.post('http://localhost:5000/api/equipment', finalValues, { headers: getAuthHeader() });
            message.success('Equipment added successfully!');
            form.resetFields();
            setCategory('');
            navigate('/InStockView'); // Redirect to In Stock View after successful addition
        } catch (error) {
            console.error("Error adding equipment:", error.response ? error.response.data : error.message);
            message.error(error.response?.data?.message || 'Failed to add equipment.');
        }
    };

    const handleValuesChange = (changedValues) => {
        if (changedValues.category) {
            setCategory(changedValues.category);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <Card style={{ width: '100%', maxWidth: 1200, margin: '0' ,border: 'none',boxShadow: 'none',background: 'transparent',}} variant="outlined">
                <Title level={3} style={{ textAlign: 'center', marginTop: '0px',marginBottom: '30px' }}>Add New Equipment</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    onValuesChange={handleValuesChange}
                    initialValues={{ status: 'In Stock' }}
                >
                    <Row gutter={24}>
                        {/* Column 1 (Left Side: Core Information fields) */}
                        <Col xs={24} lg={12}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Core Information</Title>
                            <Row gutter={16}>
                                {/* REVERTED: Col spans to 12 for two columns per row within this Card */}
                                <Col span={12}>
                                    <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Please select a category!' }]} style={{ marginBottom: 12 }}>
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
                                <Col span={12}>
                                    <Form.Item name="status" label="Status" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
                                        <Select defaultValue="In Stock" disabled>
                                            <Option value="In Stock">In Stock</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                {/* Conditional custom category field */}
                                {category === 'Other' && (
                                    <Col span={24}> {/* Custom category always takes full width of its sub-section for readability */}
                                        <Form.Item name="customCategory" label="Custom Category Name" rules={[{ required: true, message: 'Please enter a custom category name!' }]} style={{ marginBottom: 12 }}>
                                            <Input placeholder="e.g., Docking Station" />
                                        </Form.Item>
                                    </Col>
                                )}
                                <Col span={12}>
                                    <Form.Item
                                        name="purchasePrice"
                                        label="Purchase Price (INR)"
                                        rules={[
                                            { type: 'number', transform: (value) => parseFloat(value), message: 'Price must be a number!' },
                                            { min: 0, message: 'Price cannot be negative!' }
                                        ]}
                                        style={{ marginBottom: 12 }}
                                    >
                                        <Input type="number" step="0.01" placeholder="e.g., 25000.00" className="hide-number-arrows" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="purchaseDate" label="Date of Purchase" rules={[{ required: true, message: 'Please select purchase date!' }]} style={{ marginBottom: 12 }}>
                                        <DatePicker style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Col>

                        {/* Column 2 (Right Side: Hardware & Warranty Details fields) */}
                        <Col xs={24} lg={12}>
                            <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>Hardware & Warranty Details</Title>
                            <Row gutter={16}>
                                {/* REVERTED: Col spans to 12 for two columns per row within this Card */}
                                <Col span={12}><Form.Item name="model" label="Model / Brand" rules={[{ required: true, message: 'Please enter model/brand!' }]} style={{ marginBottom: 12 }}><Input placeholder="e.g., Dell Latitude 5420" /></Form.Item></Col>
                                <Col span={12}><Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true, message: 'Please enter serial number!' }]} style={{ marginBottom: 12 }}><Input placeholder="Enter serial number" /></Form.Item></Col>
                                <Col span={12}>
                                    <Form.Item name="location" label="Location" rules={[{ required: true, message: 'Please select a location!' }]} style={{ marginBottom: 12 }}>
                                        <Select placeholder="Select Location">
                                            <Option value="Bangalore">Bangalore</Option>
                                            <Option value="Mangalore">Mangalore</Option>
                                            <Option value="Hyderabad">Hyderabad</Option>
                                            <Option value="USA">USA</Option>
                                            <Option value="Canada">Canada</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}><Form.Item name="warrantyInfo" label="Warranty Expiry Date" style={{ marginBottom: 12 }}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                            </Row>
                        </Col>
                    </Row>

                    {/* Additional Comments (Full Width Below 2 Columns) */}
                    <Form.Item name="comment" label="Additional Comments" style={{ marginTop: 8, marginBottom: 0 }}>
                        <Input.TextArea rows={3} placeholder="Any other relevant details..." />
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
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
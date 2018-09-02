pragma solidity ^0.4.21;

contract Tensegrity {
    enum CourseStatus { IS_OFF, STARTING, IS_ON }
    
    event LessonStarted (
        address indexed teacher
    );
    
    struct Course {
        address student;
        address author;
        CourseStatus status;
        uint price;
    }
    
    struct Dispute {
        address student;
        address author;
        uint price;
    }
    
    mapping (address => Course) public courses;
    mapping (address => Dispute) public disputes;
    
    function teacher_ready_to_give_lesson(uint price, address student, address author) public {
        require(price != 0, "price should not be equal to zero");
        require(courses[msg.sender].student == address(0) && courses[student].student == address(0), "teacher or using is in lesson");
        
        Course memory course = Course({
            student: student,
            price: price,
            status: CourseStatus.STARTING,
            author: author
        });
        
        courses[msg.sender] = course;
    }
    
    function student_start_lesson(address teacher) public payable {
        require(courses[teacher].student == msg.sender, "This less is not yours");
        require(courses[teacher].status == CourseStatus.IS_OFF, "Lesson is already going on");
        require(courses[teacher].price == msg.value, "Invalid amount");
        
        courses[teacher].status = CourseStatus.IS_ON;
        emit LessonStarted(teacher);
    }
    
    function student_end_lesson(bool is_ok, address teacher) public {
        require(courses[teacher].student == msg.sender, "look");
        require(courses[teacher].status != CourseStatus.IS_ON, "Course is off");
        
        if (is_ok) {
            require(teacher.send(courses[teacher].price));
        }
        else {
            disputes[teacher] = Dispute({
                student: msg.sender,
                author: courses[teacher].author,
                price: courses[teacher].price
            });
        }
        
        courses[teacher].student = address(0);
        courses[teacher].status = CourseStatus.IS_OFF;
    }

    function resolve_dispute(address teacher, bool teacher_is_right) public {
        
        if (teacher_is_right) {
            require(teacher.send(disputes[teacher].price));
            return;
        }
        
        require(disputes[teacher].student.send(disputes[teacher].price));
    }
}
